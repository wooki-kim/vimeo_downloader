const Fs = require("fs");
const Path = require("path");
const Listr = require("listr");
const Axios = require("axios");
var fs = require("fs");
var scanf = require('scanf');

console.log('Insert Client identifier');
var identifier = scanf('%s');
console.log('Insert Manage App Secrets');
var app_secrets = scanf("%s");
console.log('IPersonal Access Tokens');
var personal_access_tokens = scanf("%s");

let Vimeo = require("vimeo").Vimeo;

let client = new Vimeo(
  identifier, 
  app_secrets, 
  personal_access_tokens
);
const ROOT_DIR = "./vimeo_downloader_backup";

client.request(
  {
    method: "GET",
    path: "/me/folders",
  },
  function (error, body, status_code, headers) {
    if (!fs.existsSync(ROOT_DIR)) {
      fs.mkdirSync(ROOT_DIR);
    }
    console.log(body);
    body.data.map((folders, i) => {
      var store = [];
      console.log(folders);
      console.log(i, folders.name);
      //폴더 생성
      var dir = ROOT_DIR + "/" + folders.name;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
      }

      client.request(
        {
          method: "GET",
          path: folders.uri + "/videos",
        },
        function (error, body, status_code, headers) {
          body.data.map((video_data, i) => {
            video_data.download.map((video) => {
              if (video.width == "1920") {
                console.log(
                  i,
                  " ",
                  folders.name,
                  " ",
                  video.link,
                  video_data.name
                );
                store.push({
                  dir: ROOT_DIR + "/" + folders.name,
                  filename: video_data.name + ".mp4",
                  link: video.link,
                });
              }
            });
          });

          console.log(store);
          downloader(store);
        }
      );
    });
  }
);

async function downloader(store) {
  function one(tasks) {
    tasks.run().then().catch(process.exit);
  }

  if (process.argv) {
    const tasks = [];
    store.map((data) => {
      tasks.push({
        title: data.dir.replace(ROOT_DIR + "/", "") + " : " + data.filename,
        task: async (ctx, task) => {
          const path = Path.resolve(data.dir, data.filename);
          console.log("path:", path);
          const response = await Axios({
            method: "GET",
            url: data.link,
            responseType: "stream",
          });

          response.data.pipe(Fs.createWriteStream(path));
          return new Promise((resolve, reject) => {
            response.data.on("end", () => {
              resolve();
            });

            response.data.on("error", (err) => {
              console.log("ERROR");
              reject(err);
            });
          });
        },
      });
    });

    one(new Listr(tasks));
  }
}
