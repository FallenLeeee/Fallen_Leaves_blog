const BING_URL = "https://bing.img.run/rand_uhd.php";

function downloadBingImage(onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", BING_URL, true);
    xhr.responseType = "blob";

    xhr.onprogress = function (e) {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 400) {
        const blobUrl = URL.createObjectURL(xhr.response);
        resolve(blobUrl);
      } else {
        reject(new Error("HTTP " + xhr.status));
      }
    };

    xhr.onerror = function () {
      reject(new Error("Network error"));
    };

    xhr.send();
  });
}
