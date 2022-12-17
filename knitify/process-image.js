const Jimp = require('jimp');
const RgbQuant = require('rgbquant');


let colors_arr = [];
let stitchOnly = false;
let resized_width, resized_height;


const hexToRGB = (hex) => {
	if (typeof hex === 'object') return hex; //it was already rgb array

  let alpha = false,
    h = hex.slice(hex.startsWith('#') ? 1 : 0);
  if (h.length === 3) h = [...h].map((x) => x + x).join('');
  else if (h.length === 8) alpha = true;
  h = parseInt(h, 16);
  return [
    Number((alpha ? a : '') + (h >>> (alpha ? 24 : 16))),
    Number((h & (alpha ? 0x00ff0000 : 0x00ff00)) >>> (alpha ? 16 : 8)),
    Number(((h & (alpha ? 0x0000ff00 : 0x0000ff)) >>> (alpha ? 8 : 0)) + (alpha ? h & 0x000000ff : '')),
  ];
}


function getData(img, opts, img_out_path) {
  let height, width, data;
	let palette, reduced;
	let pal_hist = [], background = [], colors_data = [];

	const processImage = new Promise((resolve) => {
		Jimp.read(img).then((image) => {
			width = image.bitmap.width;
			height = image.bitmap.height;
			data = image.bitmap.data;
			let q = new RgbQuant(opts);
			q.sample(data, width);
			palette = q.palette(true, true);
			q.idxi32.forEach(function (i32) {
				// return array of palette color occurrences
				pal_hist.push({ color: q.i32rgb[i32], count: q.histogram[i32] });
				// pal_hist.push(q.histogram[i32]);
			});
			// sort it yourself
			pal_hist.sort(function (a, b) {
				return a.count == b.count ? 0 : a.count < b.count ? 1 : -1;
			});
			
			opts.palette = pal_hist.map((el) => (el = el.color));
			pal_hist = pal_hist.map((el) => (el = el.count));
			q = new RgbQuant(opts);
			q.sample(data, width);
			palette = q.palette(true, true);
			
			let hex_arr = [];
			const RGBToHex = (r, g, b) => ((r << 16) + (g << 8) + b).toString(16).padStart(6, '0');
			for (let h = 0; h < palette.length; ++h) {
				hex_arr.push(Jimp.rgbaToInt(palette[h][0], palette[h][1], palette[h][2], 255)); //255 bc hex
				colors_data.push(RGBToHex(palette[h][0], palette[h][1], palette[h][2]));
			}
			
			reduced = q.reduce(data, 2); // indexed array

			// let motif_path = '../out-colorwork-images/knit_motif.png'; //go back! //?
			// if (fs.existsSync(motif_path)) {
			// 	rename: for (let i = 1; i < 100; ++i) {
			// 		if (!fs.existsSync(`../out-colorwork-images/knit_motif${i}.png`)) {
			// 			fs.renameSync(motif_path, `../out-colorwork-images/knit_motif${i}.png`);
			// 			break rename;
			// 		}
			// 	}
			// }

			new Jimp(width, height, (err, img) => {
				if (err) throw err;
				for (let y = 0; y < height; ++y) {
					let px_arr = reduced.splice(0, width);
					background.push(px_arr[0], px_arr[px_arr.length - 1]); // push edge colors to background array
					let px_map = [...px_arr];
					px_map = px_map.map((el) => (el += 1)); // so starting from 1
					colors_arr.push(px_map); // make it into an array with rows
					for (let x = 0; x < width; ++x) {
						let hex = hex_arr[px_arr[x]];
						img.setPixelColor(hex, x, y);
					}
				}

				// assign edge colors higher carrier numbers to prevent pockets
				function sortByFrequency(array) {
					let frequency = {};
					array.forEach(function (value) {
						frequency[value] = 0;
					});
					let uniques = array.filter(function (value) {
						return ++frequency[value] == 1;
					});
					return uniques.sort(function (a, b) {
						return frequency[b] - frequency[a];
					});
				}
				
				let edge_colors = sortByFrequency(background);
				edge_colors = edge_colors.map((el) => (el += 1)); // so starting from 1
				background = edge_colors[0];
				if (!(pal_hist[background] > 0.1 * pal_hist.reduce((a, b) => a + b, 0))) {
					background = 1; // most common color according to sorting, +1 (so not strarting from 0)
				}
				
				for (let i = 1; i <= colors_data.length; ++i) {
					if (!edge_colors.includes(i)) {
						edge_colors.push(i);
					}
				}
				
				if (edge_colors.length > 0) {
					let new_colors_data = [];
					for (let i = 0; i < edge_colors.length; ++i) {
						new_colors_data.unshift(colors_data[edge_colors[i] - 1]);
					}

					let replaced_bg = false;
					for (let i = 0; i < edge_colors.length; ++i) {
						edge_colors[i] = [edge_colors[i], edge_colors.length - i];
						if (edge_colors[i][0] === background && !replaced_bg) {
							background = edge_colors[i][1];
							replaced_bg = true;
						}
					}
					colors_data = [...new_colors_data];

					for (let r = 0; r < colors_arr.length; ++r) {
						for (let i = edge_colors.length - 1; i >= 0; --i) {
							colors_arr[r] = colors_arr[r].map((c) => {
								if (c === edge_colors[i][0]) {
									return (c = `${edge_colors[i][1]}`); // turn into string so doesn't get replaced later
								} else {
									return c;
								}
							});
						}
					}
					for (let r = 0; r < colors_arr.length; ++r) {
						colors_arr[r] = colors_arr[r].map((c) => (c = Number(c)));
					}
				}

				// let colorsDataFile = ''; //go back! //?
				// for (let h = 1; h <= colors_data.length; ++h) {
				// 	colorsDataFile += `\nCarrier ${h}: #${colors_data[h - 1]}`;
				// 	colors_data[h - 1] = `x-vis-color #${colors_data[h - 1]} ${h}`;
				// }
				// fs.writeFileSync('colorsData.txt', colorsDataFile);

				// colors_arr.push(palette, machine, background, colors_data);
				colors_arr.push(palette, background, colors_data); //new //*
				img.write(`${img_out_path}/knit_motif.png`);
				resolve(colors_arr); //TODO: have all 'fs' stuff occur outside of this
			});
		});
	});
	return processImage;
}


function palOptions(max_colors, dithering, palette_opt, min_hue_cols) {
	if (min_hue_cols === undefined) min_hue_cols = max_colors;
	let opts = {
		colors: max_colors,
		method: 2,
		minHueCols: min_hue_cols, //6144, //max_colors, //6144, // 4096 //1024 //TODO: decide between these or add an option (6144 works well for getting more color variety)
		dithKern: dithering,
		reIndex: false
	};

	if (palette_opt && palette_opt.length) { //new
		for (let i = 0; i < palette_opt.length; ++i) {
			if (typeof palette_opt[i] === 'string') palette_opt[i] = hexToRGB(palette_opt[i]);
		}

		opts.palette = palette_opt;
	}

	return opts;
}



function resizeImg(img, needle_count, row_count, img_out_path, max_needles) {
  const resized = new Promise((resolve) => {
    needle_count ? needle_count = Number(needle_count) : needle_count = Jimp.AUTO;
		row_count ? row_count = Number(row_count): row_count = Jimp.AUTO;

    if (img) {
      Jimp.read(img, (err, image) => { //TODO: have image passes as `./in-colorwork-images/${img}`
      // Jimp.read(`./in-colorwork-images/${img}`, (err, image) => { //TODO: have image passes as `./in-colorwork-images/${img}`
        if (err) throw err;

        let img_width = image.getWidth();
		    let img_height = image.getHeight();

				if (needle_count == -1 && img_width > max_needles) {
					needle_count = max_needles;

					if (row_count == -1) {
						let scale = needle_count/img_width;
          	row_count = Math.round(img_height*scale);
					}
				}

        if (needle_count == -1 && row_count == -1) row_count = img_height; //if both auto (so Jimp doesn't throw an error)
        else if (row_count % 1 !== 0) {
          let scale = needle_count/img_width;
          row_count = Math.round(img_height*scale*row_count);
          // console.log(`scaled row_count is: ${row_count}.`);
        }

        image.resize(needle_count, row_count).write(`${img_out_path}/colorwork.png`);

				resized_width = image.getWidth();
				resized_height = image.getHeight();

        resolve(image);
      });
    } else { // just stitch pattern
      stitchOnly = true; //TODO: deal with this
      
      new Jimp(needle_count, row_count, (err, image) => {
        if (err) throw err;
        for (let y = 0; y < row_count; ++y) {
          for (let x = 0; x < needle_count; ++x) {
            image.setPixelColor(4294967295, x, y); //set it all as white
          }
        }
    
        image.write(`${img_out_path}/colorwork.png`); //new //* //TODO: maybe change to 'stitch.png' //?

        resolve(image);
      });
    }
  });
  return resized;
}


function resolvePromises(img, needle_count, row_count, img_out_path, opts, max_needles, stImg, stitchPats, st_out_path) {
  const resize = new Promise((resolve, reject) => {
		resizeImg(img, needle_count, row_count, img_out_path, max_needles).then((result) => {
			resolve(result);
			return result; //?
		});
	});

  const promises = new Promise((resolve) => {
		resize.then((resized_img) => {
			getData(resized_img, opts, img_out_path).then((result) => {
				colors_arr = result;
			}).then(() => {
				if (stitchPats && stitchPats.length) {
					const stitchPatterns = require('./stitch-pattern.js');
					stitchPatterns.getStitchData(resized_height, resized_width, stImg, stitchPats, st_out_path).then((data) => {
						// stData = data;
						resolve(data); //?
					});
				} else resolve();
			});
		});
  });
  return promises;
}



function process(img_path, needle_count, row_count, img_out_path, max_colors, dithering, palette_opt, min_hue_cols, max_needles, stImg, stitchPats, st_out_path) { //TODO: update web version since added min_hue_cols
  // dithering === 'true' ? (dithering = 'Stucki') : (dithering = null);

	console.log(dithering); //remove //debug //NOTE: `TwoSierra` is actually quite good

	console.log('processing...'); //remove //debug

  return new Promise((resolve) => {
    let info_arr = [];

    let opts = palOptions(max_colors, dithering, palette_opt, min_hue_cols);

    resolvePromises(img_path, needle_count, row_count, img_out_path, opts, max_needles, stImg, stitchPats, st_out_path)
    .then((result) => {
      let stData = result; //might be undefined if no result

      info_arr = [stData, resized_width, resized_height, colors_arr];

      resolve(info_arr);
			return info_arr; //TODO: determine if need return
    });
  });
}

module.exports = { process, palOptions };
