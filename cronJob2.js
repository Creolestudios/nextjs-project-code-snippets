/**
 *
 * @category   Synchronization
 * @author     Project development team
 * @copyright  2024 Project Inc
 * @since      File available since Release 1.7.
 * @description This file used for intial user data sync
 *
 */
// Importing necessary modules and functions
import axios from "axios";
import { StatusCodes } from "http-status-codes";
import GlobalUserRecord from "../model/globalUserRecord.model";
import httpsAgent from "../httpsagents";
import { autoLogin, checkapi } from "../pages/api/auth/index";
import { getBsSessionId } from "../helpers/bsSession";
import { project_base_url } from "../helpers/GetProjectUrl";
import { host_name_middleware } from "../helpers/hostNameMiddleware";
import { middleware_api_key } from "../helpers/middlewareApiKey";
import { pos_data } from "../helpers/getPosData";
import { pos_insert } from "../helpers/insetSyncData";
import { startCronJob, stopCronJob } from "./cron";
import { errorLog_insert } from "../helpers/insertErrorLog";
import * as fs from "fs";
import { middlewareCardTypes, middlewareUrl } from "./server/middlewareUrl";
import patchCard from "../pages/api/patchCard";
import * as path from "path";
import patchImage from "../pages/api/patchImage";

const SUCCESS_MSG = "initial data loaded to project";
let PROJECT_FRONTEND_URL;
let PROJECT_BASE_URL;
let PROJECT_HOST_NAME;
// Immediately invoked function expression (IIFE) to set the Project URLs
(async () => {
  PROJECT_BASE_URL = await project_base_url();
  PROJECT_HOST_NAME = await host_name_middleware();
  PROJECT_FRONTEND_URL = PROJECT_HOST_NAME?.replace("/api", ":28523/api").replace(
    "https://",
    "http://"
  );
})();

/**
 * ANCHOR chunkArray method
 * @purpose Function to convert the array into chunks
 * @param   array, chunkSize
 * @returns returns chunks
 */
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

const tempTimeout = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve("resolved");
    }, 3000);
  });
};

let errors = [];
let rows = [];
let errorsCount = 0;
let userDumpedFile = 1;
let dumpingRows = [];

/**
 * ANCHOR addUserToProject method
 * @purpose Method to sync users from middleware to project with Image and Card data
 * @param  req, res, middlewareUsers
 * @returns Throw error code and message
 */
const addUserToProject = async (req, res, middlewareUsers) => {
  errorsCount = 0;
  try {
    if (PROJECT_FRONTEND_URL != undefined || !PROJECT_FRONTEND_URL) {
      const middleware_API_KEY = await middleware_api_key();
      const sessionId = await getBsSessionId();
      const statusfromchcekapi = await checkapi();
      if (statusfromchcekapi.status === StatusCodes.UNAUTHORIZED) {
        await autoLogin();
      }
      if (
        statusfromchcekapi.host === "127.0.0.1" &&
        statusfromchcekapi.status === StatusCodes.UNAUTHORIZED
      ) {
        //This console is intended for developer/testing purposes.
        // eslint-disable-next-line
        console.log("Error from middleware login");
      }

      const globalUsersRecord = await GlobalUserRecord.findAll();

      const globalUserDataObj = {};

      for (const iterator of globalUsersRecord) {
        globalUserDataObj[iterator.dataValues.user_id] = iterator;
      }
      //ANCHOR -  Filter middlewareUsers
      const filteredmiddlewareUsers = middlewareUsers?.filter((middlewareUser) => {
        return !(middlewareUser.id in globalUserDataObj);
      });

      //ANCHOR -  CRON JOB ADDING USER
      let userCount = 0;
      let typeId;
      const cardTypes = await middlewareCardTypes(middleware_API_KEY);
      cardTypes?.data.results.forEach((res) => {
        if (res.name.trim().toUpperCase() === "PROJECT CARD TYPE") {
          typeId = res.id;
        }
      });
      let resfromcard = {};
      let imageUploadRes = {};

      const filteredmiddlewareUsersChunks = chunkArray(filteredmiddlewareUsers, 1000);
      for (const chunk of filteredmiddlewareUsersChunks) {
        for (const middlewareUser of chunk) {
          const responseofmiddlewaregetuserbyid = await axios({
            method: "get",
            url: `${process.env.middleware_BASE_URL}/cardholders/${parseInt(middlewareUser.id)}`,
            headers: {
              Authorization: middleware_API_KEY,
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            httpsAgent,
          }).catch((err) => {
            //This console is intended for developer/testing purposes.
            // eslint-disable-next-line
            console.log(err, "Error while getting user by id");
            throw err;
          });
          let name;
          const firstName = middlewareUser?.firstName ? middlewareUser.firstName : "";
          const lastName = middlewareUser?.lastName ? " " + middlewareUser.lastName : "";
          name = `${firstName}${lastName}`.trim();
          //ANCHOR -  Defining a regular expression pattern to match name characters as per biostar
          const allowedCharsPattern = /[^a-zA-Z0-9~!@#$% *&()\-+=\[\]{};,]/g;
          //ANCHOR -  Replace characters that are not in the allowed list with an empty string
          name = name.replace(allowedCharsPattern, "");

          let UserCollection = {
            name: name,
            user_id: middlewareUser.id,
            user_group_id: {
              id: 1,
              name: "All Users",
            },
            disabled: "false",
            start_datetime: "2001-01-01T00:00:00.00Z",
            expiry_datetime: "2030-12-31T23:59:00.00Z",
          };

          try {
            // //ANCHOR - If user have image data in middleware insert the image to project
            if (responseofmiddlewaregetuserbyid?.data?.["@Image"]) {
              const ImageUrl = responseofmiddlewaregetuserbyid?.data?.["@Image"]?.href;
              const response = await middlewareUrl(ImageUrl, middleware_API_KEY);
              imageUploadRes[middlewareUser.id] = await patchImage(
                response,
                middlewareUser.id,
                PROJECT_FRONTEND_URL,
                name
              );

              res?.write(
                JSON.stringify({
                  data: {
                    value: `[${middlewareUser.id}]: Face uploaded for ${name}`,
                    type: "type_of_sync_message",
                  },
                })
              );
            } else {
              res?.write(
                JSON.stringify({
                  data: {
                    value: `[${middlewareUser.id}]: No Image for ${name}`,
                    type: "type_of_sync_message",
                  },
                })
              );
              imageUploadRes[middlewareUser.id] = [];
            }

            UserCollection["credentials"] = {
              visualFaces: imageUploadRes[middlewareUser.id],
            };
          } catch (error) {
            //This console is intended for developer/testing purposes.
            // eslint-disable-next-line
            console.log("Error when creating Image for user ", middlewareUser.id, error);
            errorsCount++;
          }

          try {
            resfromcard[middlewareUser.id] = await patchCard(
              req,
              responseofmiddlewaregetuserbyid,
              parseInt(middlewareUser.id),
              typeId,
              middleware_API_KEY,
              PROJECT_BASE_URL
            );

            if (resfromcard[middlewareUser.id] == []) {
              await errorLog_insert(
                middlewareUser.id,
                "Error when creating card for user" + name,
                1,
                "card"
              );
              errorsCount++;
              res?.write(
                JSON.stringify({
                  data: {
                    value: `[${middlewareUser.id}]: Card creation error for ${name}`,
                    type: "type_of_sync_message",
                  },
                })
              );
            } else {
              UserCollection["cards"] = resfromcard[middlewareUser.id];
              res?.write(
                JSON.stringify({
                  data: {
                    value: `[${middlewareUser.id}]: Card posted uploaded for ${name}`,
                    type: "type_of_sync_message",
                  },
                })
              );
            }
          } catch (error) {
            console.log("Error while creating card inside Project or middleware for user ", error);
          }
          //ANCHOR mainting for failure case
          dumpingRows.push(UserCollection);
          fs.writeFileSync(`sync-progress/${userDumpedFile}.json`, JSON.stringify(dumpingRows));

          rows.push(UserCollection);
          console.log(rows.length);
        }
        dumpingRows = [];
        userDumpedFile++;
      }

      try {
        res?.write(
          JSON.stringify({
            data: {
              value: `Users`,
              type: "type_of_sync",
            },
          })
        );

        const arrayChunks = chunkArray(rows, 1000);

        for (const chunk of arrayChunks) {
          let databaseUser = [];
          userCount += chunk.length;
          for (let middlewareUser of chunk) {
            databaseUser.push({
              user_id: middlewareUser.user_id,
            });
          }

          try {
            let responseOfPost = await axios({
              method: "POST",
              url: `${PROJECT_BASE_URL}/users`,
              headers: {
                "bs-session-id": `${sessionId}`,
                "Content-Type": "application/json",
              },
              httpsAgent,
              maxBodyLength: "Infinity",
              maxContentLength: "Infinity",
              data: { UserCollection: { rows: chunk } },
            });
            await GlobalUserRecord.bulkCreate(databaseUser);
            //This console is intended for developer/testing purposes.
            // eslint-disable-next-line
            console.log(responseOfPost?.data, "Response while creating user");
          } catch (error) {
            //This console is intended for developer/testing purposes.
            // eslint-disable-next-line
            console.log(error, "Error while creating user", error?.response?.data);
          }

          res?.write(
            JSON.stringify({
              data: { value: userCount, type: "user_count" },
            })
          );
        }
      } catch (error) {
        console.log("Error while posting cards inside Project", error);
      }

      /// after posting cards for each user post the cards inside project

      //ANCHOR -  insert the pos to fetch the changes at runtime in future
      //ANCHOR -  get the number of users added in DB
      const userinDB = await GlobalUserRecord.count();

      const response = await axios({
        method: "GET",
        url: `${process.env.middleware_BASE_URL}/cardholders/changes`,
        headers: {
          Authorization: middleware_API_KEY,
        },
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        httpsAgent,
      });

      const url = response?.data?.next?.href;

      const pos = url.match(/pos=(\d+)/)[1];
      //This console is intended for developer/testing purposes.
      // eslint-disable-next-line
      console.log(rows?.length, " ", userinDB);
      if (rows?.length == userinDB) {
        //ANCHOR -  insert the pos in DB
        await pos_insert(pos, true, []);
        //This console is intended for developer/testing purposes.
        // eslint-disable-next-line
        console.log("Inital sync successfull");
        res?.write(
          JSON.stringify({
            data: { value: userinDB, type: "user_count" },
          })
        );
        return SUCCESS_MSG;
      } else {
        await pos_insert(-1, false, errors);
        const error = new Error("Error while processing initial sync");
        error.code = 5253;
        throw error;
      }
    }
  } catch (error) {
    //This console is intended for developer/testing purposes.
    // eslint-disable-next-line
    console.log("Error in cronjob", error);
  }
};
/**
 * ANCHOR getAllCardholders method
 * @purpose It fetch the all cardholders from middleware
 * @param  url, allResults as array
 * @returns returns allResults array to frontend
 */
async function getAllCardholders(url, allResults = []) {
  const middleware_API_KEY = await middleware_api_key();
  const response = await axios({
    method: "GET",
    url: url,
    headers: {
      Authorization: middleware_API_KEY,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    httpsAgent,
  });

  const results = response.data.results;
  allResults.push(...results);

  // Check if there are more results
  if (response?.data?.next?.href) {
    // Recursively fetch the next page
    await getAllCardholders(response?.data?.next?.href, allResults);
  }

  return allResults;
}
/**
 * ANCHOR getRemainingCardholders method
 * @purpose It fetch the remaining cardholders from middleware
 * @param  url, remainingResults as array
 * @returns returns remainingResults array to frontend
 */
async function getRemainingCardholders(url, allResults = []) {
  const middleware_API_KEY = await middleware_api_key();
  const response = await axios({
    method: "GET",
    url: url,
    headers: {
      Authorization: middleware_API_KEY,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    httpsAgent,
  });

  const results = response.data.results;
  allResults.push(...results);

  // Check if there are more results
  if (response?.data?.next?.href) {
    // Recursively fetch the next page
    await getRemainingCardholders(response?.data?.next?.href, allResults);
  }

  return allResults;
}
/**
 * ANCHOR readLastUserId method
 * @purpose It fetch the all cardholders from file
 * @param  filePath as string
 * @returns returns user count
 */
async function readLastUserId(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    const users = JSON.parse(data);
    if (users.length === 0 || users.length === undefined) {
      console.log("No users data from file");
      rows = [];
      return null;
    }
    rows = users;
    const total_users = users.length;
    return total_users;
  } catch (error) {
    console.log(error.message, "Error in reading users from file");
    if (error.code === "ENOENT") {
      console.log("The file is not found");
    }
    return null;
  }
}
async function readUserFiles(directory) {
  let count = 0;
  // Read the contents of the directory
  const files = fs.readdirSync(directory);
  console.log(`Total number of files: ${files.length}`);
  if (files.length === 0) {
    return null;
  }
  // Filter out only JSON files

  // Read each JSON file and store its contents in the array
  for (const file of files) {
    const filePath = path.join(directory, file);
    const fileContents = fs.readFileSync(filePath, "utf-8");
    const userData = JSON.parse(fileContents);
    count += userData.length;
    rows = rows.concat(...userData);
    console.log(`Read file: ${file}`, userData.length);
  }

  /// read the latest data
  const filePath = path.join(directory, files.length + ".json");
  const fileContents = fs.readFileSync(filePath, "utf-8");
  const userData = JSON.parse(fileContents);
  dumpingRows = [...userData];
  console.log("Latestt data <<<<<<<<<<<<<<<<<", dumpingRows);
  userDumpedFile = files.length;
  return count;
}

function getFetchUserUrl(lastUserId) {
  if (lastUserId !== null) {
    console.log("Last user sync", lastUserId);
    return `${process.env.middleware_BASE_URL}/cardholders/?skip=${lastUserId}`;
  } else {
    console.log("Start from first user");
    return `${process.env.middleware_BASE_URL}/cardholders`;
  }
}

/**
 * ANCHOR runCronJob2 method
 * @purpose Main method to start the cron job after initial sync
 * @param   req, res
 */
const runCronJob2 = async (req, res) => {
  //ANCHOR -  check if middleware is already synced
  const syncData = await pos_data();
  // Directory name
  const dirName = "sync-progress";

  //ANCHOR -  if the data is beign synced initially then fetch the changes occured till now pos and store in DB
  if (!syncData || syncData.pos == -1) {
    //ANCHOR -  load the initial data to project
    try {
      res?.write(
        JSON.stringify({
          data: { value: "Cards & Face", type: "type_of_sync" },
        })
      );
      if (!fs.existsSync(dirName)) {
        fs.mkdirSync(dirName, { recursive: true });
      }
      let lastuserId = await readUserFiles(dirName);
      const fetchUserUrl = getFetchUserUrl(lastuserId);
      console.log(`Total users read: ${rows.length}`);
      const allCardholders = await getAllCardholders(fetchUserUrl);

      res?.write(
        JSON.stringify({
          data: { value: allCardholders.length + rows.length, type: "total_user_count" },
        })
      );
      const msg = await addUserToProject(req, res, allCardholders);

      //ANCHOR -  if the intital sync is failed stop the job
      if (msg?.code === 5253) {
        errors = [];
        res.end();
        stopCronJob();
      } else if (msg == SUCCESS_MSG) {
        fs.writeFileSync("./cronjob_status.txt", "1");
        stopCronJob();
        startCronJob();
        res?.write(JSON.stringify({ data: { value: errorsCount, type: "error_count" } }));
        res.end();
      }
    } catch (error) {
      //This console is intended for developer/testing purposes.
      // eslint-disable-next-line
      console.log(error.message, " Failure");
    }
  } else {
    const cronjob_status = fs.readFileSync("./cronjob_status.txt", {
      encoding: "utf-8",
    });

    if (cronjob_status == "0") {
      fs.writeFileSync("./cronjob_status.txt", "1");
      stopCronJob();
      startCronJob();
    } else if (res) {
      res?.write(JSON.stringify({ data: { value: "pos", type: "pos" } }));
    } else {
      return "Failure";
    }
    res.end();
  }
};

module.exports = { runCronJob2, getAllCardholders };
