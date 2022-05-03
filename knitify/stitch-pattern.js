const Jimp = require('jimp');
const RgbQuant = require('rgbquant');


let stPatMap = [];


function getStitchData(height, width, stImg, stitchPatterns, out_path) { //out_path is //new
  let data;
  let palette, reduced;
	let pal_hist = [];

	const processImage = new Promise((resolve) => {
    if (!stitchPatterns.length) resolve(); //new //*

    if (!stImg) { //only one stitch pattern
      stPatMap.push(stitchPatterns[0]);
      stPatMap[0].id = 0;
      stPatMap[0].rows = {};
      stPatMap[0].completed = 0;
      stPatMap[0].lastDir = undefined;
      stPatMap[0].rowDone = false;
      stPatMap[0].xfers = [undefined, undefined]; //new //check
      
      let row = [];
      for (let x = 1; x <= width; ++x) {
        row.push(x);
      }

      for (let y = 0; y < height; ++y) {
        let rowNum = height - y;
        stPatMap[0].rows[rowNum] = row;
      }

      resolve(stPatMap);
      return stPatMap;
    } else {
      let colors = [[255, 255, 255]];

      for (let i = 0; i < stitchPatterns.length; ++i) {
				colors.push(stitchPatterns[i].color);
			}

      Jimp.read(stImg).then(image => { //TODO: edit this with option of 'Enter' for stitch pattern
        image.resize(width, height, (err, image) => {
          data = image.bitmap.data;
          let opts = {
            colors: colors.length + 1,
            method: 2,
            //TODO: method: 1, //2 seems overall better, but could be good to test on more images
            minHueCols: colors.length + 1,
            dithKern: null,
            reIndex: false,
            palette: colors
          };
          let q = new RgbQuant(opts);
          q.sample(data, width);
          palette = q.palette(true, true);
          q.idxi32.forEach(function (i32) {
            ////return array of palette color occurrences
            pal_hist.push({ color: q.i32rgb[i32], count: q.histogram[i32] });
          });
  
          q = new RgbQuant(opts);
          q.sample(data, width);
          palette = q.palette(true, true);
  
          reduced = q.reduce(data, 2); ////indexed array
          stitchPixels = [...reduced]; //remove //?
  
          let hex_arr = [Jimp.rgbaToInt(palette[0][0], palette[0][1], palette[0][2], 255)]; //background color
          for (let h = 1; h < palette.length; ++h) {
            stitchPatterns[h - 1].color = Jimp.rgbaToInt(palette[h][0], palette[h][1], palette[h][2], 255);
            hex_arr.push(stitchPatterns[h - 1].color); //255 bc hex
          }
  
          for (let i = 0; i < stitchPatterns.length; ++i) {
            stPatMap.push(stitchPatterns[i]);
            stPatMap[i].id = i;
            stPatMap[i].rows = {};
            stPatMap[i].completed = 0;
            stPatMap[i].lastDir = undefined;
            stPatMap[i].rowDone = false;
            stPatMap[i].xfers = [undefined, undefined]; //new //check
          }
  
          for (let y = 0; y < height; ++y) {
            let px_arr = reduced.splice(0, width);
            for (let x = 0; x < width; ++x) {
              let hex = hex_arr[px_arr[x]];
              image.setPixelColor(hex, x, y);
            }
          }

          hex_arr.shift(); // remove background color, don't need it anymore
  
          for (let y = 0; y < height; ++y) {
            let rowNum = height - y;
            for (let x = 0; x < width; ++x) {
              let pixColor = image.getPixelColor(x, y);
              if (hex_arr.includes(pixColor)) {
                let idx = hex_arr.indexOf(pixColor);
                if (!stPatMap[idx].rows[rowNum]) stPatMap[idx].rows[rowNum] = [];
                stPatMap[idx].rows[rowNum].push(x + 1);

                if (stPatMap[idx].name === 'Horizontal Buttonholes' && y < (height-1)) { //for next row as caston //new //*
                  if (!stPatMap[idx].rows[rowNum+1]) stPatMap[idx].rows[rowNum+1] = [];
                  stPatMap[idx].rows[rowNum+1].push(x + 1);
                }
              }
            }
          }

          // get side info for buttonholes, if applicable
          let ribStPats = stPatMap.filter(el => el.name.includes('Rib'));
          if (stPatMap.some(el => el.name.includes('Buttonholes'))) { //check //v //TODO: ensure Buttonholes are only on edge (throw error if not) //TODO: detect if rib comes before for ALL of them, and if not all the same, separate into multiple stitch patterns
            for (let b = 0; b < stPatMap.length; ++b) {
              if (stPatMap[b].name.includes('Buttonholes')) {
                console.log(stPatMap[b]); //remove //debug
                stPatMap[b].action = 'bindoff'; //new //*
                let stRow1Key = Object.keys(stPatMap[b].rows)[0];
                let stRow1 = stPatMap[b].rows[stRow1Key];
                if (stRow1[0] < (width - stRow1[stRow1.length-1])) stPatMap[b].side = 'left';
                else stPatMap[b].side = 'right';

                if (ribStPats.length) {
                  let stR1Prev = `${Number(stRow1Key) - 1}`;
                  for (let r = 0; r < ribStPats.length; ++r) {
                    let ribRowKeys = Object.keys(ribStPats[r].rows);
                    
                    if (ribRowKeys.includes(stR1Prev)) { //might be surrounded //check
                      let overlap = true;

                      checkForOverlap: for (let n = stRow1[0]; n <= stRow1[stRow1.length - 1]; ++n) {
                        if (!ribStPats[r].rows[stR1Prev].includes(n)) {
                          overlap = false;
                          break checkForOverlap;
                        }
                      }
                      
                      if (overlap) stPatMap[b].name = `${ribStPats[r].name} Buttonholes`;	
                    }
                  }
                }
              }
            }
          } //^

          image.write(`${out_path}/pattern_motif.png`);
          resolve(stPatMap);
          return stPatMap;
        });
      });
    }
	});
	return processImage;
};

module.exports = { getStitchData, stPatMap };