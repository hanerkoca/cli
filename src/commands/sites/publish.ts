import { readFileSync } from "fs";
import Chalk from "chalk";
import FormData from "form-data";
import axios from "axios";
import { getToken } from "../../store/db";
import { run as runBuild } from "./build";
import { resolve } from "path";
import { getWASMRepoServer } from "../../lib/urls";
import { parseBlsConfig } from "../../lib/blsConfig"
import { logger } from "../../lib/logger"
import { slugify } from "../../lib/strings"

export const publishSite = async (
  manifest: any,
  archive: any,
  archiveName: string,
  cb?: Function
) => {
  const server = getWASMRepoServer();
  const token = getToken();
  const formData = new FormData();

  formData.append("manifest", manifest, "manifest.json");
  formData.append("wasi_archive", archive, archiveName);

  axios
    .post(`${server}/api/submit`, formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data",
      },
    })
    .then((res) => {
      console.log(Chalk.green('Publish successful!'))
      console.log('')
      
      if (cb) {
        cb(res.data);
      }
    })
    .catch((error) => {
      logger.error('Failed to publish site.', error.message)
    });
};

const logResult = (data: any) => {
  const { cid } = data;
  console.log(`Site successfully published with id ${cid}`);
};
export const run = (options: any) => {
  const {
    debug = true,
    path = process.cwd(),
    publishCallback = logResult,
    rebuild,
  } = options;
  
  // Fetch BLS config
  const { name, build, build_release } = parseBlsConfig()
  const buildConfig = !debug ? build_release : build
  const buildName = buildConfig.entry ? slugify(buildConfig.entry.replace('.wasm', '')) : slugify(name)
  const buildDir = resolve(path, buildConfig.dir || 'build')
  const wasmArchive = `${slugify(buildName)}.tar.gz`

  // Run the build command
  runBuild({ debug, path, rebuild });

  console.log(`${Chalk.yellow('Publishing:')} site located in ${buildDir}`);

  publishSite(
    readFileSync(resolve(buildDir, 'manifest.json')),
    readFileSync(resolve(buildDir, wasmArchive)),
    wasmArchive,
    publishCallback
  );
};