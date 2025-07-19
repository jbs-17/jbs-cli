import asciify from 'asciify-image';

const options = {
  fit: 'box',
  width: 64,
  height: 64
};

async function generateAsciiArt(pathtoimage) {
  try {
    const asciiArt = await asciify(pathtoimage, options);
    return asciiArt;
  } catch (err) {
    console.error(err);
  }
}

export {generateAsciiArt}