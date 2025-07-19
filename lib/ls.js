import fs from 'node:fs/promises';

export {ls};
async function ls(pathdir) {
  try {
    const list = await fs.readdir(pathdir);
    return list;
  } catch (err) {
    console.log(err);
  }
}