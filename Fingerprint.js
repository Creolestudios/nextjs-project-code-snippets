/**
 *
 * @category   React Component
 * @author     Project development team
 * @copyright  2024 Project Inc
 * @since      File available since Release 1.3.
 * @description This file initiated to display the fingerprint module.
 *
 */

import React, { useEffect, useState } from "react";
import styles from "./Fingerprint.module.css";
import { toast, ToastContainer } from "react-toastify";
import useAppRouter from "../../hooks/useAppRouter";
import { getDeviceDataByAuthType } from "../../services/client/device";
import { getUserDetails } from "../../services/client/user";
import {
  scanFingerPrint,
  saveFingerPrint,
  removeFingerPrint,
  resetFingerPrint,
  updateFingerPrintLocalData,
} from "../../services/client/fingerPrint";
import Image from "next/image";
import { exitAndSearchAgain } from "../../services/client/userSearch";
import { convertSnakeKeysToCamelCase } from "../../utils";
import PropTypes from "prop-types";
import { logFrontendEvent } from "../../utils/frontendLogger.utils";

/**
 * @purpose FingerPrint component is used to display the fingerprint scanning and enrollment
 * @props  setDeviceData, deviceData, deviceId, user, setDeviceId, handleUser, setProgressBar, disableDropdown, setDisableDropdown
 */

const Fingerprint = ({
  setDeviceData,
  deviceData,
  deviceId,
  user,
  setDeviceId,
  handleUser,
  setProgressBar,
  disableDropdown,
  setDisableDropdown,
}) => {
  const [quality, setQuality] = useState("80");
  const [rawImage, setRawImage] = useState(false);
  const [fingerNumber, setFingerNumber] = useState("2");
  const [leftFingerImg, setLeftFingerImg] = useState("");
  const [rightFingerImg, setRightFingerImg] = useState("");
  const [leftFingerImgDB, setLeftFingerImgDB] = useState("");
  const [rightFingerImgDB, setRightFingerImgDB] = useState("");
  const [leftRawImg, setLeftRawImg] = useState("");
  const [rightRawImg, setRightRawImg] = useState("");
  const [activeFingerImage, setActiveFingerImage] = useState([]);
  const [handValue, setHandValue] = useState("right");
  const [resetisOpen, setResetisOpen] = useState(false);
  const [deleteisOpen, setDeleteisOpen] = useState(false);
  const [active, setActive] = useState("2");
  const [putFingerAlert, setPutFingerAlert] = useState(false);
  const [flag, setFlag] = useState(false);
  const { redirect, path } = useAppRouter();
  const userId = path.split(":")[1];

  // Function to handle the opening and closing of the reset modal
  const handleModal = (value) => setResetisOpen(value);

  // Function to handle the opening and closing of the delete modal
  const handleDeleteModal = (value) => setDeleteisOpen(value);

  // Function to handle the change of the hand to scan
  const handleHandChange = (e) => {
    setHandValue(e.target.value);
    if (e.target.value === "left") {
      setActive("7");
      setFingerNumber("7");
    } else {
      setActive("2");
      setFingerNumber("2");
    }
  };

  // Function to verify the scan response
  const verifyScan = (responseData, _) => {
    if (responseData?.status === 1) {
      setPutFingerAlert(false);
      setProgressBar(0);
      setLeftFingerImg(responseData?.template_image0);
      setRightFingerImg(responseData?.template_image1);
      setDisableDropdown(false);
      setTimeout(() => {
        handleEnroll();
        setRawImage(false);
      }, 1500);

      if (
        responseData?.responseofrawimage &&
        responseData?.responseofrawimage?.Raw_image !== "false from raw image"
      ) {
        setLeftRawImg(responseData?.responseofrawimage?.Raw_image?.raw_image1);
        setRightRawImg(responseData?.responseofrawimage?.Raw_image?.raw_image2);
      }
    } else {
      toast.error(responseData?.message, { toastId: "scanError2" });
      setPutFingerAlert(false);
      setProgressBar(0);
      setDisableDropdown(false);
    }
  };

  // Function to perform the scan
  const doScan = (responseData, fingerprintScan) => {
    if (responseData?.status === 0) {
      toast.error(responseData?.message, { toastId: "scanError" });
      setDisableDropdown(false);
      setProgressBar(0);
    }

    if (responseData?.firstscan === "success") {
      setDisableDropdown(true);
      setProgressBar(99);
      setPutFingerAlert(true);
      scanFingerPrint({
        fingerprintScan,
        handleScanResponse: verifyScan,
        redirect,
        pathName: "/usersearch",
      });
    }
  };

  // Function to handle the scanning of the fingerprint
  const handleScan = () => {
    let fingerprintScan;

    const data = deviceData.find(
      (element) => element.name === "BioMini" && element.id === deviceId
    );

    if (data) {
      fingerprintScan = {
        uniqueId: 519,
        deviceid: deviceId,
        fingerprintSerial: fingerNumber,
        enrollQuality: quality,
        rawImage: rawImage,
        userId: userId,
        fingerIndex: fingerNumber - 1,
        deviceName: "BioMini",
      };
    } else {
      fingerprintScan = {
        uniqueId: 519,
        deviceid: deviceId,
        fingerprintSerial: fingerNumber,
        enrollQuality: quality,
        rawImage: rawImage,
        userId: userId,
        fingerIndex: fingerNumber - 1,
      };
    }

    setDisableDropdown(true);
    setProgressBar(30);

    scanFingerPrint({
      fingerprintScan,
      handleScanResponse: doScan,
      redirect,
      pathName: "/usersearch",
    });
  };

  // Function to handle the user's response
  const handleUserResponse = (responseUserData) => {
    const responseData = convertSnakeKeysToCamelCase(responseUserData);

    const temp = responseData?.userdata?.user?.fingerprintTemplates;

    //this array will be size of 10, in this array data will be saved at index according to finger index
    let array = [];
    for (let i = 0; i < 10; ++i) {
      if (temp?.findIndex((e) => e?.fingerIndex == i) != -1) {
        array[i] = temp?.[temp?.findIndex((e) => e?.fingerIndex == i)];
      } else {
        array[i] = "";
      }
    }

    setActiveFingerImage(array);
    handleUser(responseData?.userdata?.user);
    if (array[parseInt(fingerNumber) - 1] != "") {
      setLeftFingerImgDB(array[parseInt(fingerNumber) - 1]?.templateImage0);
      setRightFingerImgDB(array[parseInt(fingerNumber) - 1]?.templateImage1);
    } else {
      setLeftFingerImgDB("");
      setRightFingerImgDB("");
    }
  };

  // Function to re-render the component
  const getReRender = () => {
    if (flag) {
      getUserDetails({
        userId,
        handleUser: handleUserResponse,
        redirect,
        pathName: "/usersearch",
      });
      setFlag(false);
    } else {
      let temp = user?.fingerprintTemplates;
      let array = [];
      for (let i = 0; i < 10; ++i) {
        if (temp?.findIndex((e) => e?.fingerIndex == i) != -1) {
          array[i] = temp?.[temp?.findIndex((e) => e?.fingerIndex == i)];
        } else {
          array[i] = "";
        }
      }
      setActiveFingerImage(array);
      if (array[parseInt(fingerNumber) - 1] != "") {
        setLeftFingerImgDB(array[parseInt(fingerNumber) - 1]?.templateImage0);
        setRightFingerImgDB(array[parseInt(fingerNumber) - 1]?.templateImage1);
      } else {
        setLeftFingerImgDB("");
        setRightFingerImgDB("");
      }
    }
  };

  // Function to reset the fingerprint images
  const resetFingerPrintImage = () => {
    setLeftFingerImg("");
    setRightFingerImg("");
    setLeftRawImg("");
    setRightRawImg("");
  };

  // Function to handle the reset of the fingerprint
  const handleResetFingerPrint = () => {
    resetFingerPrintImage();
    getReRender();
  };

  // Function to handle the enrollment of the fingerprint
  const handleEnroll = () => {
    setFlag(true);
    const fingerprintSave = {
      uniqueId: 519,
      deviceid: deviceId,
      userId: parseInt(userId),
      enroll: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
    };

    saveFingerPrint({
      fingerprintSave,
      handleResetFingerPrint,
      redirect,
      pathName: "/usersearch",
    });
  };

  // Function to handle the search
  logFrontendEvent("info", "Exit and Search button clicked");
  const handleSearch = () => exitAndSearchAgain(redirect, "/usersearch", false);

  // Function to handle the response from removing the fingerprint
  const handleRemoveResponse = () => {
    resetFingerPrintImage();
    setLeftFingerImgDB("");
    setRightFingerImgDB("");
  };

  // Function to handle the removal of the fingerprint
  const handleRemove = () => {
    setFlag(true);
    setDeleteisOpen(false);
    const removeFingerprint = {
      uniqueId: 519,
      add: fingerNumber,
      deviceid: deviceId,
      userId: parseInt(userId),
    };

    removeFingerPrint({
      removeFingerprint,
      handleRemoveResponse,
      redirect,
      pathName: "/usersearch",
    });
  };

  // Function to handle the response from resetting the fingerprint
  const handleResetResponse = () => {
    handleRemoveResponse();
    handleModal(false);
  };

  // Function to handle the reset of the fingerprint
  const handleReset = () => {
    setFlag(true);
    const resetFingerprint = {
      uniqueId: 519,
      deviceid: deviceId,
      reset: true,
      userId: parseInt(userId),
    };

    resetFingerPrint({
      resetFingerprint,
      handleResetResponse,
      redirect,
      pathName: "/usersearch",
    });
    setTimeout(() => {
      getReRender();
    }, 1000);
  };

  // Function to update the local data
  const updateLocalData = (responseData) => {
    setLeftFingerImg(responseData?.template_image0);
    setRightFingerImg(responseData?.template_image0);
  };

  // Function to handle the local data
  const handleLocalData = (number) => {
    setFingerNumber(number);
    const localData = {
      uniqueId: 519,
      deviceid: deviceId,
      fingerserial: number,
    };

    setLeftRawImg("");
    setRightRawImg("");
    updateFingerPrintLocalData({
      localData,
      updateLocalData,
      redirect,
      pathName: "/usersearch",
    });
  };

  // Function to handle the device data
  const handleDeviceData = (responseData) => {
    if (responseData?.usbDevicesList?.length > 0) {
      const combinedDevices = responseData?.activeDevices.concat(responseData?.usbDevicesList);
      setDeviceData(combinedDevices);
    } else {
      setDeviceData(responseData?.activeDevices);
    }
  };

  // Use effect hook for initial API calls
  useEffect(() => {
    if (localStorage.getItem("token")) {
      const authType = "fp";

      getDeviceDataByAuthType({
        authType,
        handleResposne: handleDeviceData,
        redirect,
        pathName: "/usersearch",
      });

      if (deviceId) {
        setDeviceData("");
        setDeviceId("");
      }
      getReRender();
    }
  }, []);

  // Use effect hook to re-render the component when the left finger image, right finger image, finger number, or user changes
  useEffect(() => {
    getReRender();
  }, [leftFingerImg, rightFingerImgDB, fingerNumber, user]);

  return localStorage.getItem("token") ? (
    <>
      <ToastContainer
        position="top-center"
        autoClose={2000}
        limit={1}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      {resetisOpen && (
        <>
          <div className={styles.overlay}></div>
          <div className={styles.modal}>
            <main className={styles.modal__main}>
              <p>Are you want to reset the Data?</p>
              <button className={styles.success} onClick={handleReset}>
                Yes
              </button>
              <button className={styles.cancel} onClick={() => handleModal(false)}>
                No
              </button>
            </main>
          </div>
        </>
      )}

      {putFingerAlert && (
        <>
          <div className={styles.overlay}></div>
          <div className={styles.modal}>
            <p>Please scan the finger Again!</p>
          </div>
        </>
      )}

      {deleteisOpen && (
        <>
          <div className={styles.overlay}></div>
          <div className={styles.modal}>
            <main className={styles.modal__main}>
              <p>Are you want to delete the Data?</p>
              <button className={styles.success} onClick={handleRemove}>
                Yes
              </button>
              <button className={styles.cancel} onClick={() => handleDeleteModal(false)}>
                No
              </button>
            </main>
          </div>
        </>
      )}

      <div className={styles.fignerScanWrapper}>
        <div className={styles.fingerScanLeft}>
          <div className={styles.fingerScanFilters}>
            <div className={styles.fingerScanFiltersDropdownFirst}>
              <select
                className={styles.searchList}
                onChange={handleHandChange}
                disabled={disableDropdown}
              >
                <option value="right">Right</option>
                <option value="left">Left</option>
              </select>
            </div>
            <div className={styles.fingerScanFiltersDropdownSecond}>
              <select
                defaultValue={"80"}
                onChange={(e) => setQuality(e.target.value)}
                className={styles.searchList}
                disabled={disableDropdown}
              >
                <option value="20">20</option>
                <option value="40">40</option>
                <option value="60">60</option>
                <option value="80">80</option>
                <option value="100">100</option>
              </select>
            </div>
            <div className={styles.rawImageWrapper}>
              <div className={styles.formgroup}>
                <label htmlFor="rawImage" className={styles.controlCheckbox}>
                  {"Raw Image"}
                  <input
                    type="checkbox"
                    id="rawImage"
                    onChange={(e) => setRawImage(e.target.checked)}
                    disabled={disableDropdown}
                    checked={rawImage}
                  />
                  <div className={styles.controlIndicator}></div>
                </label>
              </div>
            </div>
          </div>
          {handValue === "left" ? (
            <div className={styles.fingerScannedDisplay}>
              <Image
                src="/fingerprint/fullHand.svg"
                alt="scanned fingers display"
                height="148"
                width="123"
              />
              <div className={`${styles.fingerOne} ${active === "10" ? styles.active : ""}`}>
                <Image
                  src={
                    activeFingerImage?.length >= 1 &&
                    activeFingerImage[9] != "" &&
                    activeFingerImage[9] != undefined
                      ? `/color fingers/finger_pink.svg`
                      : `/fingerprint/fingerthree.svg`
                  }
                  onClick={() => {
                    handleLocalData("10");
                    setActive("10");
                  }}
                  width={13.5}
                  height={17}
                  alt=""
                />
              </div>
              <div className={`${styles.fingerTwo} ${active === "9" ? styles.active : ""}`}>
                <Image
                  src={
                    activeFingerImage?.length >= 1 &&
                    activeFingerImage[8] != "" &&
                    activeFingerImage[8] != undefined
                      ? `/color fingers/finger_pink.svg`
                      : `/fingerprint/fingerthree.svg`
                  }
                  onClick={() => {
                    handleLocalData("9");
                    setActive("9");
                  }}
                  width={17}
                  height={20}
                  alt=""
                />
              </div>
              <div className={`${styles.fingerThree} ${active === "8" ? styles.active : ""}`}>
                <Image
                  src={
                    activeFingerImage?.length >= 1 &&
                    activeFingerImage[7] != "" &&
                    activeFingerImage[7] != undefined
                      ? `/color fingers/finger_orange.svg`
                      : `/fingerprint/fingerthree.svg`
                  }
                  onClick={() => {
                    handleLocalData("8");
                    setActive("8");
                  }}
                  width={18}
                  height={22}
                  alt=""
                />
              </div>
              <div className={`${styles.fingerFour} ${active === "7" ? styles.active : ""}`}>
                <Image
                  src={
                    activeFingerImage?.length >= 1 &&
                    activeFingerImage[6] != "" &&
                    activeFingerImage[6] != undefined
                      ? `/color fingers/finger_green.svg`
                      : `/fingerprint/fingerthree.svg`
                  }
                  onClick={() => {
                    handleLocalData("7");
                    setActive("7");
                  }}
                  width={18}
                  height={22}
                  alt=""
                />
              </div>

              <div className={`${styles.fingerFive} ${active === "6" ? styles.active : ""}`}>
                <Image
                  src={
                    activeFingerImage?.length >= 1 &&
                    activeFingerImage[5] != "" &&
                    activeFingerImage[5] != undefined
                      ? `/color fingers/finger_pink.svg`
                      : `/fingerprint/fingerthree.svg`
                  }
                  onClick={() => {
                    handleLocalData("6");
                    setActive("6");
                  }}
                  width={16}
                  height={20}
                  alt=""
                />
              </div>
            </div>
          ) : (
            <div className={`${styles.fingerScannedDisplay} ${styles.right}`}>
              <Image
                className={styles.fullHand}
                src="/fingerprint/fullRightHand.svg"
                alt="scanned fingers display"
                height="148"
                width="123"
              />
              <div className={`${styles.fingerOne} ${active === "5" ? styles.active : ""}`}>
                <Image
                  src={
                    activeFingerImage?.length >= 1 &&
                    activeFingerImage[4] != "" &&
                    activeFingerImage[4] != undefined
                      ? `/color fingers/finger_pink.svg`
                      : `/fingerprint/fingerthree.svg`
                  }
                  onClick={() => {
                    handleLocalData("5");
                    setActive("5");
                  }}
                  width={13}
                  height={16}
                  alt=""
                />
              </div>
              <div className={`${styles.fingerTwo} ${active === "4" ? styles.active : ""}`}>
                <Image
                  src={
                    activeFingerImage?.length >= 1 &&
                    activeFingerImage[3] != "" &&
                    activeFingerImage[3] != undefined
                      ? `/color fingers/finger_green.svg`
                      : `/fingerprint/fingerthree.svg`
                  }
                  width={15}
                  height={19}
                  alt=""
                  onClick={() => {
                    handleLocalData("4");
                    setActive("4");
                  }}
                />
              </div>
              <div className={`${styles.fingerThree} ${active === "3" ? styles.active : ""}`}>
                <Image
                  src={
                    activeFingerImage?.length >= 1 &&
                    activeFingerImage[2] != "" &&
                    activeFingerImage[2] != undefined
                      ? `/color fingers/finger_orange.svg`
                      : `/fingerprint/fingerthree.svg`
                  }
                  onClick={() => {
                    handleLocalData("3");
                    setActive("3");
                  }}
                  alt=""
                  width={17}
                  height={22}
                />
              </div>
              <div className={`${styles.fingerFour} ${active === "2" ? styles.active : ""}`}>
                <Image
                  src={
                    activeFingerImage?.length >= 1 &&
                    activeFingerImage[1] != "" &&
                    activeFingerImage[1] != undefined
                      ? `/color fingers/finger_pink.svg`
                      : `/fingerprint/fingerthree.svg`
                  }
                  onClick={() => {
                    handleLocalData("2");
                    setActive("2");
                  }}
                  alt=""
                  width={18}
                  height={18}
                />
              </div>
              {/* <!-- Add active class for active finger  --> */}
              <div className={`${styles.fingerFive} ${active === "1" ? styles.active : ""}`}>
                <Image
                  src={
                    activeFingerImage?.length >= 1 &&
                    activeFingerImage[0] != "" &&
                    activeFingerImage[0] != undefined
                      ? `/color fingers/finger_pink.svg`
                      : `/fingerprint/fingerthree.svg`
                  }
                  onClick={() => {
                    handleLocalData("1");
                    setActive("1");
                  }}
                  alt=""
                  width={17}
                  height={20}
                />
              </div>
            </div>
          )}
        </div>
        <div className={styles.fingerScanRight}>
          {leftFingerImg || leftFingerImgDB ? (
            <button
              onClick={() => handleDeleteModal(true)}
              className={`${styles.fingerScanFlotBtn} reset-button`}
            >
              <div className={styles.actionBtns}>
                <Image src="/userdetails/remove.svg" height={28} width={28} alt="" />
              </div>
            </button>
          ) : null}

          {leftFingerImg || leftFingerImgDB ? null : (
            <button onClick={handleScan} className={`${styles.fingerScanFlotBtn} reset-button`}>
              <div className={styles.actionBtns}>
                <Image src="/fingerprint/scan.svg" height={28} width={28} alt="" />
                <p>scan</p>
              </div>
            </button>
          )}

          <div className={styles.finerScanItemWrapper}>
            <div
              className={`${styles.fingerScanItem} ${
                leftFingerImg || leftFingerImgDB ? "" : styles.inactive
              }`}
            >
              {leftFingerImg || leftFingerImgDB ? (
                <Image
                  src={
                    leftFingerImg
                      ? `data:image/png;base64,${leftFingerImg} `
                      : `data:image/png;base64,${leftFingerImgDB}`
                  }
                  alt="face"
                  height={80}
                  width={70}
                />
              ) : (
                <Image src="/fingerprint/fingerprint_null.svg" height={80} width={70} alt="" />
              )}
            </div>
            <div
              className={`${styles.fingerScanItem} ${
                rightFingerImg || rightFingerImgDB ? "" : styles.inactive
              }`}
            >
              {rightFingerImg || rightFingerImgDB ? (
                <Image
                  src={
                    rightFingerImg
                      ? `data:image/png;base64,${rightFingerImg} `
                      : `data:image/png;base64,${rightFingerImgDB}`
                  }
                  alt="finger"
                  height={80}
                  width={70}
                />
              ) : (
                <Image src="/fingerprint/fingerprint_null.svg" height={80} width={70} alt="" />
              )}
            </div>
            {rawImage === true ? (
              <>
                <div className={styles.fingerScanItem}>
                  {leftRawImg ? (
                    <Image
                      src={`data:image/png;base64,${leftRawImg}`}
                      alt="face"
                      height={80}
                      width={70}
                    />
                  ) : (
                    <span className={styles.rawImgText}>
                      Raw <br />
                      Image
                    </span>
                  )}
                </div>
                <div className={styles.fingerScanItem}>
                  {rightRawImg ? (
                    <Image
                      src={`data:image/png;base64,${rightRawImg}`}
                      alt="face"
                      height={80}
                      width={70}
                    />
                  ) : (
                    <span className={styles.rawImgText}>
                      Raw <br />
                      Image
                    </span>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.footerWrapper}>
        <button onClick={handleSearch} className="reset-button">
          <div className={styles.exitSearchLink}>
            <Image src="/arrowleft.svg" alt="arrow back" height={20} width={20} />
            <span>Exit & Search again</span>
          </div>
        </button>
        <div className={styles.footerButtonWrapper}>
          <button className={styles.btnOrange} onClick={() => handleModal(true)}>
            Reset
          </button>
        </div>
      </div>
    </>
  ) : (
    redirect("/")
  );
};

// PropTypes for the Fingerprint component
Fingerprint.propTypes = {
  setDeviceData: PropTypes.func.isRequired,
  deviceData: PropTypes.array.isRequired,
  deviceId: PropTypes.string.isRequired,
  user: PropTypes.object.isRequired,
  setDeviceId: PropTypes.func.isRequired,
  handleUser: PropTypes.func.isRequired,
  setProgressBar: PropTypes.func.isRequired,
  disableDropdown: PropTypes.bool.isRequired,
  setDisableDropdown: PropTypes.func.isRequired,
};

export default Fingerprint;
