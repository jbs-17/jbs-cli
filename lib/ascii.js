import asciify from 'asciify-image';



async function generateAsciiArt(pathtoimage, options) {
  try {
    const asciiArt = await asciify(pathtoimage, options);
    return asciiArt;
  } catch (err) {
    console.error(err);
  }
}

export { generateAsciiArt }