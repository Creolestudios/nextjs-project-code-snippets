/**
 *
 * @category   Page
 * @author     Project development team
 * @copyright  2024 Project Inc
 * @since      File available since Release 1.3.
 * @description This file is initiated to display the user details page for the application.
 *
 */

import styles from "../styles/userDetails.module.css";
import React, { useEffect, useState } from "react";
import VisualFace from "../components/visualface/Visualface";
import Fingerprint from "../components/fingerprint/Fingerprint";
import Image from "next/image";
import Header from "../components/header/Header";
import Progressbar from "../components/progressbar/progressbar";
import Card from "../components/card/Card";
import { debounce } from "lodash";
import { ToastContainer } from "react-toastify";
import { getUserDetails } from "../services/client/user";
import useAppRouter from "../hooks/useAppRouter";
import { convertSnakeKeysToCamelCase } from "../utils";
import Qr from "../components/card/QR code/Qr";

/**
 * @purpose User details page for the application where user details are displayed with scan modules
 */

const UserDetails = () => {
  const [deviceData, setDeviceData] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [user, setUser] = useState({});
  const [userId, setUserId] = useState("");
  const [module, setModule] = useState("");
  const [progressBar, setProgressBar] = useState(0);
  const [syncStatus, setSyncStatus] = useState(false);
  const [disableDropdown, setDisableDropdown] = useState(false);
  const { redirect, path } = useAppRouter();

  const [lastSync, setLastSync] = useState("");

  // Function to handle last sync time
  function handleLastSync(value) {
    setLastSync(value);
  }

  // Function to handle user details
  const handleUser = (userDetailsResponse, isSync) => {
    const userData = convertSnakeKeysToCamelCase(userDetailsResponse.userData?.User ?? {});

    setUser(userData);

    if (isSync) {
      setSyncStatus(false);
    }
  };

  // Function to handle sync operation, debounced to prevent rapid calls
  const handleSync = debounce((userId) => {
    setSyncStatus(true);
    getUserDetails({
      userId,
      handleUser,
      redirect,
      pathName: "/usersearch",
      isSync: true,
    });
  }, 800);

  // Use effect hook to handle component mount operations
  useEffect(() => {
    if (localStorage.getItem("token") === null) {
      redirect("/");
    } else {
      const pathArray = path.split(":");

      setModule(pathArray?.at(-1));
      setUserId(pathArray[1]);
      getUserDetails({
        userId: pathArray[1],
        handleUser,
        redirect,
        pathName: "/usersearch",
      });
    }
  }, []);

  return (
    <>
      {/* Display a toast notification container at the top-center of the screen */}
      <ToastContainer
        position="top-center"
        autoClose={2000}
        limit={1}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        className={styles.aocToast}
      />

      {/* Display a progress bar with the current progress value */}
      <Progressbar progress={progressBar} />

      {/* Display a header with the last sync time and a function to set the last sync time */}
      <Header lastSync={lastSync} setLastSync={handleLastSync} />

      {/* Display the user's name and user ID, and a button to sync the user's data */}
      <div className={styles.scanDetailWithFilter}>
        <div className={styles.scanDetailUserName}>
          <span>
            {user?.name} ({user?.userId})
          </span>
          <button
            className={`${styles.scan} reset-button p-0`}
            onClick={() => handleSync(user?.userId)}
          >
            {syncStatus ? (
              <Image src="/userdetails/sync-animation.gif" alt="finger" height={20} width={20} />
            ) : (
              <Image src="/userdetails/sync.svg" alt="finger" height={20} width={20} />
            )}
          </button>
        </div>
        <div className={styles.scanFilter}>
          <button
            className={`${styles.scan} ${module === "519" ? styles.active : ""} reset-button`}
            onClick={() => {
              redirect(`/userdetails?:${userId}:519`);
              setModule("519");
            }}
          >
            {module === "519" ? (
              <Image
                src="/userdetails/ic_round-fingerprint.svg"
                alt="finger"
                height={20}
                width={20}
              />
            ) : (
              <Image
                src="/userdetails/ic_round-fingerprint-black.svg"
                alt="finger"
                height={20}
                width={20}
              />
            )}
          </button>

          <button
            className={`${styles.scan} ${module === "215" ? styles.active : ""} reset-button`}
            onClick={() => {
              redirect(`/userdetails?:${userId}:215`);
              setModule("215");
            }}
          >
            {module === "215" ? (
              <Image src="/userdetails/user.svg" alt="visual" height={20} width={20} />
            ) : (
              <Image src="/userdetails/user-black.svg" alt="visual" height={20} width={20} />
            )}
          </button>
          <button
            className={`${styles.scan} ${module === "23" ? styles.active : ""} reset-button`}
            onClick={() => {
              redirect(`/userdetails?:${userId}:23`);
              setModule("23");
            }}
          >
            {module === "23" ? (
              <Image src="/userdetails/card.svg" alt="finger" height={20} width={20} />
            ) : (
              <Image src="/userdetails/card-black.svg" alt="finger" height={20} width={20} />
            )}
          </button>

          <button
            className={`${styles.scan} ${module === "1617" ? styles.active : ""} reset-button`}
            onClick={() => {
              redirect(`/userdetails?:${userId}:1617`);
              setModule("1617");
            }}
          >
            {module === "1617" && (
              <Image
                src="/userdetails/qr-code-svgrepo-com.svg"
                alt="finger"
                height={20}
                width={20}
              />
            )}
          </button>
          <div className={`${styles.scanByDropdown}`}>
            <select
              className={`${styles.searchList} ${module === "23" ? styles.cursorNotAllowed : styles.cursorPointer}`}
              onChange={(e) => setDeviceId(e.target.value)}
              disabled={module === "23" || module === "1617" || disableDropdown}
            >
              <option value="SelectDevice">Select device</option>
              {deviceData?.length > 0 &&
                deviceData.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* visual face module  */}
      {module === "215" && (
        <VisualFace
          setDeviceData={setDeviceData}
          deviceData={deviceData}
          deviceId={deviceId}
          setDeviceId={setDeviceId}
          handleUser={(data) => setUser(data)}
          setProgressBar={setProgressBar}
          syncStatus={syncStatus}
        />
      )}

      {/* fingure print module  */}
      {module === "519" && (
        <Fingerprint
          setDeviceData={setDeviceData}
          deviceData={deviceData}
          deviceId={deviceId}
          user={user}
          setDeviceId={setDeviceId}
          handleUser={(data) => setUser(data)}
          setProgressBar={setProgressBar}
          disableDropdown={disableDropdown}
          setDisableDropdown={setDisableDropdown}
        />
      )}

      {/* card module  */}
      {module === "23" && (
        <Card
          user={user}
          setDeviceData={setDeviceData}
          setDeviceId={setDeviceId}
          deviceId={deviceId}
          deviceData={deviceData}
        />
      )}

      {/* qr card module  */}
      {module === "1617" && (
        <Qr user={user} setDeviceId={setDeviceId} deviceId={deviceId} deviceData={deviceData} />
      )}
    </>
  );
};

export default UserDetails;
