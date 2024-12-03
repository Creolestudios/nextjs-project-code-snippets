/**
 *
 * @category   React Component
 * @author     Project development team
 * @copyright  2024 Project Inc
 * @since      File available since Release 1.3.
 * @description This file initiated to display the face scan module.
 *
 */

import styles from "./visualface.module.css";
import React, { useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import Image from "next/image";
import useAppRouter from "../../hooks/useAppRouter";
import { getDeviceDataByAuthType } from "../../services/client/device";
import { exitAndSearchAgain } from "../../services/client/userSearch";
import { getUserDetails } from "../../services/client/user";
import {
  remove,
  scanFace,
  saveFace,
  resetFace,
  uploadFace,
} from "../../services/client/visualFace";
import { convertSnakeKeysToCamelCase } from "../../utils";
import FaceScanElements from "./FaceScanElements";
import PropTypes from "prop-types";

/**
 * @purpose Visual Face component is used to display the face scan details and update of the user
 * @props  setDeviceData, deviceId, setDeviceId, handleUser, setProgressBar, syncStatus
 */

const VisualFace = ({
  setDeviceData,
  deviceId,
  setDeviceId,
  handleUser,
  setProgressBar,
  syncStatus,
}) => {
  const [leftImg, setLeftImg] = useState("");
  const [rightImg, setRightImg] = useState("");
  const [leftImgDB, setLeftImgDB] = useState("");
  const [rightImgDB, setRightImgDB] = useState("");
  const [resetIsOpen, setResetIsOpen] = useState(false);
  const [deleteIsOpen, setDeleteIsOpen] = useState(false);
  const [removeBtn, setRemoveBtn] = useState("");
  const [scanning, setScanning] = useState(false);
  const { redirect, path } = useAppRouter();
  const userId = path.split(":")[1];
  const uniqueId = 215;

  // Function to handle search againANCHOR -  HANDLE SEARCH AGAIN
  const handleSearch = () => exitAndSearchAgain(redirect, "/usersearch", false);

  // Function to update user details
  const update = (responseData, _) => {
    handleUser(convertSnakeKeysToCamelCase(responseData?.userData?.User));
    setLeftImgDB(
      responseData?.userData?.User?.credentials?.visualFaces[0]?.template_ex_normalized_image ||
        responseData?.userData?.User?.credentials?.visualFaces[0]?.template_ex_picture
    );
    setRightImgDB(
      responseData?.userData?.User?.credentials?.visualFaces[1]?.template_ex_normalized_image ||
        responseData?.userData?.User?.credentials?.visualFaces[1]?.template_ex_picture
    );
  };

  // Function to re-render user data
  const dataReRender = () => {
    getUserDetails({
      userId,
      handleUser: update,
      redirect,
      pathName: "/usersearch",
    });
  };

  // Function to convert image to base64 and upload data
  function encodeImageFileAsURL(element, no) {
    let file = element.target.files[0];
    file &&
      file.size / 1024 / 1024 > 1 &&
      toast.error("Image size exceed", { toastId: "sizeExceed" });

    let reader = new FileReader();
    let setname;

    reader.onloadend = function () {
      setname = reader.result;
      let data = setname.split(";base64,");
      let imagepath = data[1];
      let uploadForFace = no;

      uploadFace({
        imagepath,
        uploadForFace,
        uniqueId,
        handleSave,
        redirect,
        pathName: "/usersearch",
      });
    };

    if (file) {
      reader.readAsDataURL(file);
    }
  }

  // Function to handle scan response
  const handleScanResponse = (scanData, faceSerialNumber) => {
    if (scanData.status === 0) {
      toast.error(scanData?.message, { toastId: "scanInitialError" });
      setProgressBar(0);
    } else {
      setProgressBar(99);
      handleSave();
      dataReRender();
      if (faceSerialNumber === "1") {
        setLeftImg(scanData?.credentials?.visualFaces[0]?.template_ex_normalized_image);
      } else {
        setRightImg(scanData?.credentials?.visualFaces[0]?.template_ex_normalized_image);
      }
      setProgressBar(0);
    }
    setScanning(false);
  };
  // Function to handle scan API
  const handleScan = (btnNum) => {
    setScanning(true);
    const visualFaceBody = {
      visualfacesSerial: btnNum,
      deviceid: deviceId,
      poseSensitivity: 0,
      nonBlock: true,
      uniqueId: uniqueId,
    };

    setProgressBar(30);
    scanFace({
      visualFaceBody,
      handleResponse: handleScanResponse,
      redirect,
      pathName: "/usersearch",
    });
  };

  // Function to reset face data
  const resetFaceData = () => {
    setLeftImg("");
    setLeftImgDB("");
    setRightImg("");
    setRightImgDB("");
    handleResetModal(false);
  };

  // Function to handle reset buttonTON
  const handleReset = () => {
    const visualFaceReset = {
      uniqueId: uniqueId,
      visualfacesSerial: ["1", "2"],
      userId: parseInt(userId),
    };

    resetFace({
      visualFaceReset,
      resetFaceData,
      redirect,
      pathName: "/usersearch",
    });
  };

  // Function to handle save visual face
  const handleSave = () => {
    const visualFaceSave = {
      uniqueId: uniqueId,
      enroll: ["1", "2"],
      authType: "face",
      userId: parseInt(userId),
    };

    saveFace({
      visualFaceSave,
      dataReRender,
      redirect,
      pathName: "/usersearch",
    });
  };

  // Function to remove visual face
  const handleRemove = (btn) => {
    setDeleteIsOpen(false);
    const removeVisualFace = {
      uniqueId: uniqueId,
      authType: "face",
      remove: btn,
      userId: parseInt(userId),
    };

    const resetImage = (message) => {
      if (btn === "1" && message === "Data removed") {
        setLeftImg("");
        setLeftImgDB("");
      } else {
        setRightImgDB("");
        setRightImg("");
      }
    };

    remove({
      removeVisualFace,
      resetImage,
      redirect,
      pathName: "/usersearch",
    });
  };

  // Function to handle delete modal
  const handleDeleteModal = (value) => setDeleteIsOpen(value);

  // Function to handle reset modal
  const handleResetModal = (value) => setResetIsOpen(value);

  //ANCHOR - HANDLE LOAD DATA
  useEffect(() => {
    if (!localStorage.getItem("token")) {
      redirect("/");
    } else {
      if (deviceId) {
        setDeviceData("");
        setDeviceId("");
      }
      getDeviceDataByAuthType({
        authType: "visual_face",
        handleResposne: (data) => setDeviceData(data?.activeDevices),
        redirect,
        path: "/usersearch",
      });
    }
  }, []);

  // useEffect hook to re-render data
  useEffect(() => {
    dataReRender();
  }, [leftImgDB, rightImgDB, syncStatus]);

  return (
    <>
      {/* ToastContainer for displaying notifications */}
      <ToastContainer
        position="top-center"
        autoClose={2000}
        limit={1}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
      />
      {/* Modal for resetting data */}
      {resetIsOpen && (
        <>
          <div className={styles.overlay}></div>
          <div className={styles.modal}>
            <main className={styles.modal__main}>
              <p>Are you want to reset the Data?</p>
              <button className={styles.success} onClick={handleReset}>
                Yes
              </button>
              <button className={styles.cancel} onClick={() => handleResetModal(false)}>
                No
              </button>
            </main>
          </div>
        </>
      )}
      {/* Modal for deleting data */}
      {deleteIsOpen && (
        <>
          <div className={styles.overlay}></div>
          <div className={styles.modal}>
            <main className={styles.modal__main}>
              <p>Are you want to delete the Data?</p>
              <button className={styles.success} onClick={() => handleRemove(removeBtn)}>
                Yes
              </button>
              <button className={styles.cancel} onClick={() => handleDeleteModal(false)}>
                No
              </button>
            </main>
          </div>
        </>
      )}
      {/* Card Section for displaying face scans  */}
      <div className={styles.faceScanWrapper}>
        <div className={styles.faceScanItem}>
          {leftImg || leftImgDB ? (
            <Image
              className={styles.mainImageWrapper}
              src={
                leftImg ? `data:image/png;base64,${leftImg} ` : `data:image/png;base64,${leftImgDB}`
              }
              alt="user scanned face"
              height={168}
              width={168}
            />
          ) : (
            <Image
              className={styles.mainImageWrapper}
              src="/userdetails/userdummy.svg"
              alt="user scanned face"
              height={168}
              width={168}
            />
          )}

          <FaceScanElements
            image={leftImg}
            imageDb={leftImgDB}
            id={"files"}
            position={"1"}
            scan={scanning}
            handleRemoveElement={() => {
              handleDeleteModal(true);
              setRemoveBtn("1");
            }}
            handleScanElement={() => {
              handleScan("1");
            }}
            handleChange={encodeImageFileAsURL}
          />
        </div>
        <div className={styles.faceScanItem}>
          {rightImg || rightImgDB ? (
            <Image
              className={styles.mainImageWrapper}
              src={
                rightImg
                  ? `data:image/png;base64,${rightImg} `
                  : `data:image/png;base64,${rightImgDB}`
              }
              alt="user scanned face"
              height={168}
              width={168}
            />
          ) : (
            <Image
              className={styles.mainImageWrapper}
              src="/userdetails/userdummy.svg"
              alt="user scanned face"
              height={168}
              width={168}
            />
          )}

          <FaceScanElements
            image={rightImg}
            imageDb={rightImgDB}
            id={"files2"}
            position={"2"}
            scan={scanning}
            handleRemoveElement={() => {
              handleDeleteModal(true);
              setRemoveBtn("2");
            }}
            handleScanElement={() => {
              handleScan("2");
            }}
            handleChange={encodeImageFileAsURL}
          />
        </div>
      </div>
      {/* Footer section with buttons for exiting search and resetting data */}
      <div className={styles.footerWrapper}>
        <button className={`${styles.exitSearchLink} reset-button`} onClick={handleSearch}>
          <Image src="/userdetails/arrow-left.svg" alt="arrow back" height={20} width={20} />
          <span>Exit & Search again</span>
        </button>

        <div className={styles.footerButtonWrapper}>
          <button className={styles.btnOrange} onClick={() => handleResetModal(true)}>
            Reset
          </button>
        </div>
      </div>
    </>
  );
};

// PropTypes for the VisualFace component
VisualFace.propTypes = {
  deviceId: PropTypes.string.isRequired,
  setDeviceData: PropTypes.func.isRequired,
  setDeviceId: PropTypes.func.isRequired,
  handleUser: PropTypes.func.isRequired,
  setProgressBar: PropTypes.func.isRequired,
  syncStatus: PropTypes.bool.isRequired,
};

export default VisualFace;
