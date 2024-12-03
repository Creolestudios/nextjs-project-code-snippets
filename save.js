/**
 *
 * @package   Fingerprint
 * @author    Project development team
 * @copyright 2024 Project Inc
 * @since     File available since Release 1.3.
 * @description This file initiated save the fingerprints
 *
 */
// Importing necessary modules and functions
import NextCors from "nextjs-cors";
import { getBsSessionId } from "../../../helpers/bsSession";
import axios from "axios";
import httpsAgent from "../../../httpsagents";
import fs from "fs";
import { StatusCodes } from "http-status-codes";
import { project_base_url } from "../../../helpers/GetProjectUrl";
import { saveMessages } from "../../../config/constant";
/**
 * ANCHOR save method
 * @purpose To save  the fingerprints of the user
 * @param   req,res
 * @returns returns message,status and render to forntend
 */
export default async function save(req, res) {
  await NextCors(req, res, {
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
    origin: "*",
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  });
  //ANCHOR - INSERTING USER FINGERPRINTS
  const putUserFingerperintsbyId = async (
    uniqueId,
    userId,
    fingerprintSerial,
    fingerprint_templatesdb
  ) => {
    try {
      const PROJECT_BASE_URL = await project_base_url();
      const sessionId = await getBsSessionId();
      const valueforpush = [];
      const template0 = [];
      //ANCHOR - WHEN HAVEING FINGERPRINT
      if (fingerprint_templatesdb?.length != undefined) {
        for (const serial of fingerprintSerial) {
          const paddedSerial = serial.padStart(2, "0");
          valueforpush.push(`${uniqueId}_${paddedSerial}`);
        }

        for (let i = 0; i < valueforpush.length; i++) {
          let a = fingerprint_templatesdb.findIndex((e) => e.finger_index == i);

          const checkfileexists = fs.existsSync(`./${valueforpush[i]}.json`);
          if (checkfileexists) {
            const jsonString = fs.readFileSync(`./${valueforpush[i]}.json`);
            template0[i] = {
              template0: JSON.parse(jsonString).fingerPrintsObj.template0,
              template1: JSON.parse(jsonString).fingerPrintsObj.template1,
              finger_mask: false,
              isNew: true,
              finger_index: JSON.parse(jsonString).fingerPrintsObj.finger_index,
            };
          } else if (a != -1) {
            template0[i] = {
              template0: fingerprint_templatesdb[a].template0,
              template1: fingerprint_templatesdb[a].template1,
              finger_mask: false,
              isNew: true,
              finger_index: fingerprint_templatesdb[a].finger_index,
            };
          }
        }
      }
      //ANCHOR - WHEN NOT HAVEING FINGERPRINT
      else {
        for (let i = 0; i < fingerprintSerial.length; i++) {
          const paddedSerial = fingerprintSerial[i].padStart(2, "0");
          valueforpush.push(`${uniqueId}_${paddedSerial}`);
          const checkfileexists = fs.existsSync(`./${valueforpush[i]}.json`);
          if (checkfileexists) {
            const jsonString = fs.readFileSync(`./${valueforpush[i]}.json`);
            template0.push({
              template0: JSON.parse(jsonString).fingerPrintsObj.template0,
              template1: JSON.parse(jsonString).fingerPrintsObj.template1,
              finger_mask: false,
              isNew: true,
              finger_index: JSON.parse(jsonString).fingerPrintsObj.finger_index,
            });
          }
        }
      }
      //ANCHOR - SORTING THE FINGERPRINTS
      template0.sort((a, b) => {
        if (a.finger_index < b.finger_index) {
          return -1;
        }
        if (a.finger_index > b.finger_index) {
          return 1;
        }
        return 0;
      });
      let template0temp = [];
      for (let i = 0; i < template0.length; i++) {
        if (template0[i]?.template0 != undefined) {
          template0temp[i] = template0[i];
        }
      }
      //ANCHOR - PUT USER FINGERPRINTS
      const responsePutUser = await axios({
        method: "PUT",
        url: `${PROJECT_BASE_URL}/users/${userId}`,
        headers: {
          "bs-session-id": `${sessionId}`,
        },
        httpsAgent,
        data: { User: { fingerprint_templates: template0temp } },
      });
      //ANCHOR - IF PUT USER FINGERPRINTS SUCCESS THEN DELETE THE FILES
      if (responsePutUser.status === StatusCodes.OK) {
        for (let i = 0; i < fingerprintSerial.length; i++) {
          const paddedSerial = fingerprintSerial[i].padStart(2, "0");
          valueforpush.push(`${uniqueId}_${paddedSerial}`);
          const checkfileexists = fs.existsSync(`./${valueforpush[i]}.json`);
          if (checkfileexists) {
            fs.unlinkSync(`${valueforpush[i]}.json`);
          }
        }
        //ANCHOR - IF PUT USER FINGERPRINTS SUCCESS THEN SEND THE RESPONSE
        return res.send({
          message: saveMessages.success,
          status: 1,
          render: true,
        });
      }
    } catch (error) {
      //This console is intended for developer/testing purposes.
      // eslint-disable-next-line
      console.log("ERROR-SAVE :", error);
      const PROJECT_BASE_URL = await project_base_url();
      let ip = PROJECT_BASE_URL.split("/")[2];
      if (error?.code === "ETIMEDOUT") {
        res.send({
          status: error?.errno,
          message: `LAN is disconnected or IP is changed for (${ip})`,
        });
      }
    }
  };

  //SECTION -  BEGIN
  const PROJECT_BASE_URL = await project_base_url();
  const sessionId = await getBsSessionId();
  const { uniqueId, userId, enroll } = req.body.fingerprintSave;
  let fingerprint_templatesdb;
  if (enroll) {
    let flag = false;
    for (const enrollValue of enroll) {
      const paddedSerial = `${uniqueId}_${enrollValue.padStart(2, "0")}`;
      const checkfileexists = fs.existsSync(`./${paddedSerial}.json`);
      if (checkfileexists) {
        flag = true;
      }
    }
    if (flag) {
      //ANCHOR - GET USER DETAILS FOR FINGERPIRNTS
      const userDetilsbyId = await axios({
        method: "GET",
        url: `${PROJECT_BASE_URL}/users/${userId}`,
        headers: {
          "bs-session-id": `${sessionId}`,
        },
        httpsAgent,
      });
      let userData = userDetilsbyId.data;
      fingerprint_templatesdb = userData.User.fingerprint_templates;
    }
    //ANCHOR - PUT USER FINGERPRINTS
    await putUserFingerperintsbyId(uniqueId, userId, enroll, fingerprint_templatesdb);
  } else {
    res.send({
      message: saveMessages.error,
      status: 0,
    });
  }
  //!SECTION - END
}
