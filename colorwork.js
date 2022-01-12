//TODO: add option to count the # of needles in a row on front bed and if a lot, split it up in 2-3 passes
//TODO: add option for fair isle too (not just jacquard... also maybe ladderback jacquard ?)

const patternLibrary = require('./stitch-pattern-library.js');
let frontOnlyPatterns = patternLibrary.frontOnlyPatterns;


function filterData(data, func) { //for filtering/copying array containing objects w/o mutating original
	return data
		.filter(func) // filter array first
		.map(obj => ({ // then re-map to new objects
			...obj, // copy shallow fields
			children: obj.children && filterData(obj.children) // filter children
		}));
}


function generateKnitout(machine, colors_data, background, color_count, colors_arr, stitch_number, speed_number, caston_carrier, wasteSettings, back_style, rib_info, stitchOnly, stData, console, chalk) {
	let knitout = [];

	let xfer_speed = 300;
	let waste_carrier,
		waste_stitch = 6,
		waste_speed = 400,
		waste_roller = 150,
		waste_rows = 40;

	let kniterate_caston = [],
		waste_yarn_section = [];
	let negCaston = false;
	let user_specified_carriers = [];

	let patternCarriers = [], patterns = [], patternNeedles = [], includesPattern = false, needlesToAvoid = [];
	let patAvoidNs = {}; //new //*
	let tuckAvoid = [[], []], patAvoidIdx = 0, patTuckIdx = 1, tuckAvoidCs = [], avoidObj = {false: 0, true: 1};

	let init_dir = '-'; //for kniterate
	let other_dir = '+';

	let main_stitch_number = stitch_number; //for now

	let draw_thread, draw_dir;

	let caston = [];

	let double_bed = true; //TODO: add option for single bed

	let edge_L = [],
		edge_R = [],
		edge_needlesL = [],
		edge_needlesR = [],
		edgeL_done = false,
		edgeR_done = false;

	let rib_arr = [],
		bot_dir_switch = false;

	let rib = false, rib_top = null, rib_bottom = null, ribT_rows, ribB_rows;

	let carrier_track = [],
		initial_carriers = [],
		colorwork_carriers = [];
	const FINDMYCARRIER = ({ CARRIER, DIR, END_NEEDLE }) => ({
		CARRIER,
		DIR,
		END_NEEDLE
	});
	let track_back = [];

	let bindoff = [];
	let last_pass_dir, xfer_needle, last_needle, bindoff_carrier, bindCLastN;

	// ------------------------------
	let color_carriers = [];

	let pieceWidth = colors_arr[0].length;

	let needle_bed = (machine.includes('kniterate') ? 253 : 541); //one extra so not counting from 0

	if (stitch_number) stitch_number = Number(stitch_number);
	else {
		console.log(chalk.green(`-- Stitch number: UNSPECIFIED, will assign default value: 6`));
		stitch_number = 6;
	}

	if (speed_number) speed_number = Number(speed_number);
	else {
		console.log(chalk.green('-- Speed number: UNSPECIFIED, will assign default value: 300'));
		speed_number = 300;
	}

	if (stitchOnly && stData.length === 1 && stData[0].name === 'Lace') { //new //check
		main_stitch_number = stitch_number + 3;
		if (main_stitch_number > 9) main_stitch_number = 9;
		if (main_stitch_number != stitch_number) console.log(chalk.black.bgYellow('! WARNING:') + ` Increased main stitch number from ${stitch_number} to ${main_stitch_number} since entire piece is lace, which requires a larger stitch number.`);
	}

	let reverse = ((back_style === 'Minimal' || back_style === 'Secure') ? false : true);

	if (back_style === 'Secure') {
		// reverse = false;
		if (color_count < 4) {
			back_style = 'Minimal';
			console.log(chalk.black.bgYellow('! WARNING:') + ` Changed back style from 'Secure' to 'Minimal' since using less than 4 colors.`);
		} else {
			edge_L.push(3, 1, 2);
			
			if (color_count === 3 || color_count === 6) {
				if (pieceWidth % color_count === 0 || pieceWidth % color_count === 2) {
					edge_R.push(pieceWidth, pieceWidth - 2, pieceWidth - 1);
				} else if (pieceWidth % color_count === 5 || pieceWidth % color_count === 3) {
					edge_R.push(pieceWidth - 2, pieceWidth - 1, pieceWidth);
				} else if (pieceWidth % color_count === 4 || pieceWidth % color_count === 1) {
					edge_R.push(pieceWidth - 1, pieceWidth, pieceWidth - 2);
				} else {
					edge_R.push(pieceWidth, pieceWidth - 1, pieceWidth - 2);
				}
			} else if (color_count === 4) {
				if (pieceWidth % color_count === 0) {
					edge_R.push(pieceWidth, pieceWidth - 1, pieceWidth - 2);
				} else if (pieceWidth % color_count === 1) {
					edge_R.push(pieceWidth - 1, pieceWidth, pieceWidth - 2);
				} else if (pieceWidth % color_count === 2) {
					edge_R.push(pieceWidth - 2, pieceWidth - 1, pieceWidth);
				} else {
					edge_R.push(pieceWidth, pieceWidth - 2, pieceWidth - 1);
				}
			} else {
				if (pieceWidth % color_count === 0) {
					edge_R.push(pieceWidth, pieceWidth - 1, pieceWidth - 2);
				} else if (pieceWidth % color_count === 2) {
					edge_R.push(pieceWidth - 2, pieceWidth - 1, pieceWidth);
				} else if (pieceWidth % color_count === 3) {
					edge_R.push(pieceWidth, pieceWidth - 2, pieceWidth - 1);
				} else {
					edge_R.push(pieceWidth - 1, pieceWidth, pieceWidth - 2);
				}
			}
		}
	}

	//TODO: add option to specify bind off carrier
	if (caston_carrier) {
		caston_carrier = Number(caston_carrier);
		user_specified_carriers.push(caston_carrier);
	} else console.log(chalk.green(`-- Cast-on carrier : UNSPECIFIED, will assign default value (background color)`));

	if (rib_info) {
		rib = true;
		rib_top = rib_info['rib_top'];
		ribT_rows = rib_info['ribT_rows'];
		
		if (rib_top !== null) {
			rib_top = Number(rib_top); //new
			ribT_rows = Number(ribT_rows); //?
			if (rib_top > color_count && !user_specified_carriers.includes(rib_top)) user_specified_carriers.push(rib_top);
		}
		
		rib_bottom = rib_info['rib_bottom'];
		ribB_rows = rib_info['ribB_rows'];

		if (rib_bottom !== null) {
			rib_bottom = Number(rib_bottom); //new
			ribB_rows = Number(ribB_rows); //?
			if (rib_bottom > color_count && !user_specified_carriers.includes(rib_bottom)) user_specified_carriers.push(rib_bottom);
		}
		
	}

	if (wasteSettings) {
		if ('waste_carrier' in wasteSettings) {
			waste_carrier = Number(wasteSettings['waste_carrier']);
			user_specified_carriers.push(waste_carrier);
		}
		if ('waste_stitch' in wasteSettings) waste_stitch = Number(wasteSettings['waste_stitch']);
		if ('waste_speed' in wasteSettings) waste_speed = Number(wasteSettings['waste_speed']);
		if ('waste_roller' in wasteSettings) waste_roller = Number(wasteSettings['waste_roller']);
		if ('waste_rows' in wasteSettings) waste_rows = Number(wasteSettings['waste_rows']);
	}

	if (stData) {
		for (let st in stData) {
			if (stData[st].carrier !== null && !patternCarriers.includes(stData[st].carrier)) patternCarriers.push(stData[st].carrier); //new //*
			// if (stData[st].carrier !== null) patternCarriers.push(stData[st].carrier);
			// patternCarriers.push(stData[st].carrier);
		}
	}

	//----------------
	let dir, needle, carrier;
	let roller_advance = 100;

	let all_needles = [], even_bird = [], odd_bird = [];

	for (let x = 1; x <= pieceWidth; ++x) {
		all_needles.push(x);
		x % 2 === 0 ? even_bird.push(x) : odd_bird.push(x);
	}

	let rows = [];
	let row = [], carrier_passes = [];

	for (let y = 0; y < colors_arr.length; ++y) {
		for (let x = 0; x < colors_arr[y].length; ++x) {
			needle = x + 1; ////so counting from 1 not 0
			carrier = colors_arr[y][x];
			row.push([needle, carrier]);
		}
		for (let i = 1; i <= color_count; ++i) {
			let carrier_pass = row.filter((n) => n[1] === i);
			if (carrier_pass.length === 0 && back_style === 'Birdseye') carrier_pass = [['carrier', i]]; //? options for build up on back but true birds eye
			carrier_passes.push(carrier_pass);
			carrier_pass = [];
		}
		if (back_style === 'Birdseye') {
			rows.push(carrier_passes);
		} else {
			carrier_passes = carrier_passes.map((it) => it.filter((_) => true)).filter((sub) => sub.length); ////?keep empty passes ?
			if (carrier_passes.length === 1 && !stitchOnly) { //TODO: maybe make this only for if !stitchOnly && only one carrier
				carrier_passes.push([[]]);
			}
			rows.push(carrier_passes);
		}
		row = [];
		carrier_passes = [];
	}

	let passes_per_row = [];
	let extra_back6 = 0;
	for (let i = 0; i < rows.length; ++i) {
		if (i % 2 !== 0 && reverse) {
			rows[i].reverse();
		}
		passes_per_row.push(rows[i].length);
	}

	let jacquard_passes = rows.flat();

	let row_count = 1;
	let pass_count = 0;
	let leftovers = [],
		stored_leftovers = [];

	knitout.push(`;row: ${row_count}`);

	if (passes_per_row[row_count - 1] >= 5) { //// - 1 since starting from 1 not 0 for row count
		knitout.push('x-roller-advance 0');
		roller_advance = 0;
	}

	let prev_row = 0;
	let taken, inhook, neg_carrier, end_needle, dir_caston;
	let back_needles = [];

	if (!caston_carrier) { //new if no caston carrier specified //*//*//*
		if (jacquard_passes[0].some((p) => p[1] == background)) caston_carrier = background;
		else {
			if (rib_bottom !== null) caston_carrier = rib_bottom;
			else caston_carrier = jacquard_passes[0][0][1];
		}
	}

	if (!waste_carrier) waste_carrier = jacquard_passes[0][0][1]; //new if no waste carrier specified //*//*//*

	let pos_caston = [], neg_caston = [];

	const ODD_CASTON = (x, dir, dir_caston) => {
		// x % 2 !== 0 ? dir_caston.push(`knit ${dir} f${x} ${jacquard_passes[0][0][1]}`) : dir_caston.push(`knit ${dir} b${x} ${jacquard_passes[0][0][1]}`);
		x % 2 !== 0 ? dir_caston.push(`knit ${dir} f${x} ${caston_carrier}`) : dir_caston.push(`knit ${dir} b${x} ${caston_carrier}`);
	};

	const EVEN_CASTON = (x, dir, dir_caston) => {
		// x % 2 === 0 ? dir_caston.push(`knit ${dir} f${x} ${jacquard_passes[0][0][1]}`) : dir_caston.push(`knit ${dir} b${x} ${jacquard_passes[0][0][1]}`);
		x % 2 === 0 ? dir_caston.push(`knit ${dir} f${x} ${caston_carrier}`) : dir_caston.push(`knit ${dir} b${x} ${caston_carrier}`);
	};


	for (let x = 1; x <= pieceWidth; ++x) {
		machine.includes('kniterate') || (machine.includes('shima') && pieceWidth % 2 === 0) ? ODD_CASTON(x, '+', pos_caston) : EVEN_CASTON(x, '+', pos_caston);
	}

	for (let x = pieceWidth; x > 0; --x) {
		machine.includes('kniterate') || (machine.includes('shima') && pieceWidth % 2 === 0) ? EVEN_CASTON(x, '-', neg_caston) : ODD_CASTON(x, '-', neg_caston);
	}

	// get patternNeedles for first row
	if (stData) {
		patterns = filterData(stData, el => el.rows.hasOwnProperty(`${row_count}`));
		for (let p = 0; p < patterns.length; ++p) {
			patternNeedles.push([...patterns[p].rows[row_count]]);
		}
	}

	// -------------------------
	for (let i = 0; i < jacquard_passes.length; ++i) {
		let single_color = false;

		let back_mod;
		passes_per_row[row_count - 1] < 6 && back_style === 'Secure' ? (back_mod = passes_per_row[row_count - 1]) : (back_mod = 5);
		
		if (i === 0 || i === prev_row + passes_per_row[row_count - 1]) { //first pass of the row
			if (i !== 0) {
				if (passes_per_row[row_count - 1] === 6) {
					extra_back6 < 4 ? ++extra_back6 : (extra_back6 = 0);
				}

				pass_count = 0;
				row_count += 1;
			}

			if (stData) {
				needlesToAvoid = [];
				tuckAvoid = [[], []];
				tuckAvoidCs = []; //*
				for (let st in stData) {
					stData[st].rowDone = false;
				}

				patternNeedles = [];
				patterns = filterData(stData, el => el.rows.hasOwnProperty(`${row_count}`));

				let inactivePats = filterData(stData, el => !el.rows.hasOwnProperty(`${row_count}`));

				for (let p = 0; p < inactivePats.length; ++p) {
					if (inactivePats[p].id in patAvoidNs) delete patAvoidNs[inactivePats[p].id];
				}
				
				for (let p = 0; p < patterns.length; ++p) {
					patternNeedles.push([...patterns[p].rows[row_count]]);
					
					let st = stData.findIndex(el => el.id === patterns[p].id); // stData[st].completed

					if (stData[st].name.includes('Buttonholes')) { //assign carrier based on whether binding off or casting on
						if (stData[st].action === 'bindoff') stData[st].carrier = jacquard_passes[i+(passes_per_row[row_count]-1)][0][1]; //last carrier in pass
						else stData[st].carrier = jacquard_passes[i][0][1]; //will just do whatever carrier is first in pass
					}
					
					let pMin = patterns[p].rows[row_count][0];
					let pMax = patterns[p].rows[row_count][patterns[p].rows[row_count].length - 1]; //TODO: change these to match splitting up patterns

					let pAvoid = patternLibrary.generatePattern(patterns[p], stData[st].completed, pMin, pMax, stData[st].rows[row_count], false); //will return just needles to avoid
					
					if (pAvoid.length) {
						if (typeof pAvoid[0] === 'object') {
							tuckAvoidCs.push(patterns[p].carrier);
							tuckAvoid[0] = [...tuckAvoid[0], ...pAvoid[0]];
							tuckAvoid[1] = [...tuckAvoid[1], ...pAvoid[1]];
						} else needlesToAvoid = [...needlesToAvoid, ...pAvoid];
					}
				}
			}

			if (i !== 0) {
				knitout.push(`;row: ${row_count}`);
				if (passes_per_row[row_count - 1] >= 5) { // - 1 since starting from 1 not 0 for row count
					knitout.push('x-roller-advance 0');
					roller_advance = 0;
				} else if (passes_per_row[row_count - 1] < 5 && passes_per_row[row_count - 2] >= 5) {
					knitout.push('x-roller-advance 100');
					roller_advance = 100;
				}
				prev_row = i;
				back_needles = [];
			}
		}

		if (tuckAvoid[0].length && !tuckAvoidCs.includes(carrier)) { //TODO: maybe change this //?
			patAvoidIdx = avoidObj[!patAvoidIdx];
			patTuckIdx = avoidObj[!patTuckIdx];
		}

		if (stData) {
			let rowFinishedPats = filterData(stData, el => el.rows.hasOwnProperty(`${row_count}`) && el.rowDone === true);

			for (let p = 0; p < rowFinishedPats.length; ++p) {
				let pId = rowFinishedPats[p].id;
				let st = stData.findIndex(el => el.id === pId); // stData[st].completed

				let pMin = rowFinishedPats[p].rows[row_count][0];
				let pMax = rowFinishedPats[p].rows[row_count][rowFinishedPats[p].rows[row_count].length - 1]; //TODO: change these to match splitting up patterns

				let pAvoid = patternLibrary.generatePattern(rowFinishedPats[p], stData[st].completed, pMin, pMax, stData[st].rows[row_count], false); //will return just needles to avoid

				patAvoidNs[pId] = pAvoid;
			}
		} //finishedPatIds

		if ((passes_per_row[row_count - 1] === 6 && pass_count === 2) || (passes_per_row[row_count - 1] === 5 && pass_count === 1)) {
			knitout.push('x-roller-advance 150');
			roller_advance = 150;
		}
		if ((passes_per_row[row_count - 1] === 6 && pass_count === 3) || (passes_per_row[row_count - 1] === 5 && pass_count === 2)) {
			knitout.push('x-roller-advance 0');
			roller_advance = 0;
		}
		if ((passes_per_row[row_count - 1] === 6 && pass_count === 5) || (passes_per_row[row_count - 1] === 5 && pass_count === 4)) {
			// knitout.push('x-roller-advance 450');
			// roller_advance = 450;
			knitout.push('x-roller-advance 300');
			roller_advance = 300;
		}
		
		i % 2 === 0 ? (dir = init_dir) : (dir = other_dir);

		if (jacquard_passes[i][0].length > 0) {
			carrier = jacquard_passes[i][0][1];
		} else {
			single_color = true;
			carrier = jacquard_passes[i - 1][0][1];
			if (carrier === undefined) carrier = jacquard_passes[i - 2][0][1]; //TODO: make this work for birdseye too
		}

		let tracked_end_needle = (dir === '+' ? pieceWidth : 1); //TODO: make this different if needlesToAvoid.length
		if (!carrier_track.some((el) => el.CARRIER === carrier)) {
			carrier_track.push(
				FINDMYCARRIER({
					CARRIER: carrier,
					DIR: dir,
					END_NEEDLE: tracked_end_needle
				})
			);
			initial_carriers.push(
				FINDMYCARRIER({
					CARRIER: carrier,
					DIR: dir,
					END_NEEDLE: tracked_end_needle
				})
			);
			colorwork_carriers.push(carrier);
		} else {
			let previous = carrier_track.find((obj) => obj.CARRIER === carrier);
			let prev_idx = carrier_track.findIndex((obj) => obj.CARRIER === carrier);
			if (previous.DIR === dir) {
				dir === '+' ? (dir = '-') : (dir = '+');
			}

			function bringInCarrierFromPattern(c, cIdx, direction) {
				if (patternCarriers.includes(c)) {
					let start_needle = (direction === '-' ? pieceWidth : 1);
					if (Math.abs(carrier_track[cIdx].END_NEEDLE - start_needle) > 4) {
						let bringInFrom = carrier_track[cIdx].END_NEEDLE;
						knitout.push(';bring in carrier from pattern');
						if (dir === '+') {
							for (let n = bringInFrom; n >= start_needle; --n) { //negative because need to finish prev pass
								if (n % 3 === 0) knitout.push(`knit - b${n} ${c}`);
							}
						} else {
							for (let n = bringInFrom; n <= start_needle; ++n) {
								if (n % 3 === 0) knitout.push(`knit + b${n} ${c}`);
							}
						}
					}
				}
			}
			if (stData) {
				bringInCarrierFromPattern(carrier, prev_idx, dir);
			}

			let stack_track = carrier_track.filter((obj) => obj.DIR === dir); //TODO: maybe add this for patterns?
			if (stack_track.length > 3) {
				let least_freq;
				if (track_back.length > 0) {
					if (track_back.length < color_count) {
						for (let t = 0; t < stack_track.length; ++t) {
							if (!track_back.includes(stack_track[t].CARRIER)) {
								least_freq = stack_track[t].CARRIER;
								break;
							}
						}
					}
					if (least_freq === undefined) {
						let track_back_dir = track_back.filter((el) => stack_track.some((c) => c.CARRIER === el));
						least_freq = [
							...track_back_dir.reduce(
								(
									r,
									n // create a map of occurrences
								) => r.set(n, (r.get(n) || 0) + 1),
								new Map()
							),
						].reduce((r, v) => (v[1] < r[1] ? v : r))[0]; // get the the item that appear less times
					}
				} else {
					least_freq = stack_track[0].CARRIER;
				}
				track_back.push(least_freq);
				let track_dir;
				dir === '+' ? ((track_dir = '-'), (tracked_end_needle = 1)) : ((track_dir = '+'), (tracked_end_needle = pieceWidth));
				if (!carrier_track.some((el) => el.CARRIER === least_freq)) {
					carrier_track.push(
						FINDMYCARRIER({
							CARRIER: least_freq,
							DIR: track_dir,
							END_NEEDLE: tracked_end_needle
						})
					);
					initial_carriers.push(
						FINDMYCARRIER({
							CARRIER: least_freq,
							DIR: track_dir,
							END_NEEDLE: tracked_end_needle
						})
					);
					colorwork_carriers.push(least_freq);
				} else {
					let least_idx = carrier_track.findIndex((obj) => obj.CARRIER === least_freq);

					bringInCarrierFromPattern(carrier_track[least_idx].CARRIER, least_idx, track_dir); //check

					carrier_track[least_idx].DIR = track_dir;
					carrier_track[least_idx].END_NEEDLE = tracked_end_needle;
				}
				if (track_dir === '+') {
					for (let t = 1; t < pieceWidth; ++t) {
						if (t === 1 || t === pieceWidth - 1 || t % Number(least_freq) === 0) {
							knitout.push(`knit + b${t} ${least_freq}`);
						}
					}
				} else {
					for (let t = pieceWidth; t >= 1; --t) {
						if (t === 1 || t === pieceWidth - 1 || t % Number(least_freq) === 0) {
							knitout.push(`knit - b${t} ${least_freq}`);
						}
					}
				}
			}

			tracked_end_needle = (dir === '+' ? pieceWidth : 1);
			carrier_track[prev_idx].DIR = dir;
			carrier_track[prev_idx].END_NEEDLE = tracked_end_needle;
		}
		
		if (!knitout.some((el) => el === `inhook ${carrier}`) && machine.includes('shima') && carrier !== jacquard_passes[0][0][1]) { ////last one is to save inhook & releasehook for caston if first carrier
			knitout.push(`inhook ${carrier}`);
			color_carriers.push(carrier);
			inhook = true;
		}
		const knitoutLines = (x, last) => {
			let notFrontOp = `knit ${dir} b${x} ${carrier}`;

			let front = jacquard_passes[i].find((element) => element[0] === x);

			if (patternNeedles.length) { //skip over any front needles that were already addressed in stitch pattern
				for (let p = 0; p < patternNeedles.length; ++p) { //check //TODO: for ones where it is the carrier but other pattern prevents it from getting to end needle, add 'bringInFrom'
					if (patternNeedles[p].includes(x)) {
						front = undefined;
						stored_leftovers.push(x);
					}
				}
			}

			if (front !== undefined) {
				knitout.push(`knit ${dir} f${front[0]} ${carrier}`);
				taken = true;
			} else {
				taken = false;
			}

			if (Object.keys(patAvoidNs).length) {
				if (Object.values(patAvoidNs).some(arr => arr.includes(x) || (typeof arr[patAvoidIdx] === 'object' && arr[patAvoidIdx].includes(x)))) {
					if (x === end_needle && !taken && !knitout[knitout.length - 1].includes(`b${end_needle}`)) {
						knitout.push(`miss ${dir} f${x} ${carrier}`);
					}
					return;
				}
			}

			if (single_color && double_bed) { //? //check //come back!
				knitout.push(notFrontOp);
				back_needles.push(x); //check //remove //? or keep? //TODO: maybe add this for Secure/Minimal?
			} else {
				if (back_style === 'Ladderback') {
					if (!taken) {
						let missing_needles = [];
						if (i === prev_row + passes_per_row[row_count - 1] - 1) missing_needles = all_needles.filter((x) => back_needles.indexOf(x) === -1);
						if (i % 4 === 0) {
							if (x % 4 === 1) {
								knitout.push(notFrontOp);
								back_needles.push(x);
							} else {
								if (missing_needles.includes(x)) {
									knitout.push(notFrontOp);
								}
							}
						} else if (i % 4 === 1) {
							if (x % 4 === 2) {
								knitout.push(notFrontOp);
								back_needles.push(x);
							} else {
								if (missing_needles.includes(x)) {
									knitout.push(notFrontOp);
								}
							}
						} else if (i % 4 === 2) {
							if (x % 4 === 3) {
								knitout.push(notFrontOp);
								back_needles.push(x);
							} else {
								if (missing_needles.includes(x)) {
									knitout.push(notFrontOp);
								}
							}
						} else if (i % 4 === 3) {
							if (x % 4 === 0) {
								knitout.push(notFrontOp);
								back_needles.push(x);
							} else {
								if (missing_needles.includes(x)) {
									knitout.push(notFrontOp);
								}
							}
						}
					}
				} else if (back_style === 'Minimal' || back_style === 'Secure') {
					if (back_style === 'Secure') {
						if (pass_count === 5) pass_count = extra_back6;
						if (edge_needlesL.length === 0) edge_needlesL = [...edge_L];
						if (edge_needlesR.length === 0) edge_needlesR = [...edge_R];
					}
					if ((dir === '+' && x === 1) || (dir === '-' && x === pieceWidth)) {
						stored_leftovers = [...new Set([...stored_leftovers, ...leftovers])];
						leftovers = [];
						edgeL_done = false;
						edgeR_done = false;
					}
					if (back_style === 'Secure' && (edge_L.includes(x) || edge_R.includes(x))) {
						if (!taken) {
							if (!edgeL_done && edge_L.includes(x)) {
								if (pass_count <= 3 && x % back_mod === pass_count) {
									knitout.push(notFrontOp);
									if (edge_needlesL.includes(x)) edge_needlesL.splice(edge_needlesL.indexOf(x), 1);
									edgeL_done = true;
								} else if (x === edge_needlesL[0]) {
									knitout.push(notFrontOp.replace(`${x} ${carrier}`, `${edge_needlesL[0]} ${carrier}`));
									edge_needlesL.shift();
									edgeL_done = true;
								}
								
								if (stored_leftovers.includes(x)) {
									stored_leftovers.splice(stored_leftovers.indexOf(x), 1);
								}
							} else if (!edgeR_done && edge_R.includes(x)) {
								if (pass_count <= 3 && x % back_mod === pass_count) {
									knitout.push(notFrontOp);
									if (edge_needlesR.includes(x)) edge_needlesR.splice(edge_needlesR.indexOf(x), 1);
									edgeR_done = true;
								} else if (x === edge_needlesR[0]) {
									knitout.push(notFrontOp.replace(`${x} ${carrier}`, `${edge_needlesR[0]} ${carrier}`));
									edge_needlesR.shift();
									edgeR_done = true;
								}
								
								if (stored_leftovers.includes(x)) {
									stored_leftovers.splice(stored_leftovers.indexOf(x), 1);
								}
							}
						} else {
							edge_needlesL.includes(x) ? (edgeL_done = true) : (edgeR_done = true);
						}
					} else {
						if (x % back_mod === pass_count) {
							if (!taken) {
								knitout.push(notFrontOp);
								if (stored_leftovers.includes(x)) {
									stored_leftovers.splice(stored_leftovers.indexOf(x), 1);
								}
							} else {
								leftovers.push(x);
							}
						} else if (stored_leftovers.includes(x)) {
							if (!taken) {
								knitout.push(notFrontOp);
								stored_leftovers.splice(stored_leftovers.indexOf(x), 1);
							}
						} else {
							leftovers.push(x);
						}
					}
				} else { //Default or birdseye //TODO: figure out what's happening with birdseye
					if (!taken && !stitchOnly) {
						if (i % 2 === 0) {
							if (x % 2 !== 0) {
								knitout.push(notFrontOp);
								back_needles.push(x);
							} else {
								let missing_needles = even_bird.filter((x) => back_needles.indexOf(x) === -1);
								if (stored_leftovers) missing_needles = [...missing_needles, ...stored_leftovers];
								if (missing_needles.includes(x) && i === prev_row + passes_per_row[row_count - 1] - 1) {
									knitout.push(notFrontOp);
									if (stored_leftovers) stored_leftovers.splice(stored_leftovers.indexOf(x), 1); //check //*
								}
							}
						} else {
							if (x % 2 === 0) {
								knitout.push(notFrontOp);
								back_needles.push(x);
							} else {
								let missing_needles = odd_bird.filter((x) => back_needles.indexOf(x) === -1);
								if (stored_leftovers) missing_needles = [...missing_needles, ...stored_leftovers];
								if (missing_needles.includes(x) && i === prev_row + passes_per_row[row_count - 1] - 1) {
									knitout.push(notFrontOp);
									if (stored_leftovers) stored_leftovers.splice(stored_leftovers.indexOf(x), 1); //check //*
								}
							}
						}
					}
				}
				if (x === end_needle && !taken && !knitout[knitout.length - 1].includes(`b${end_needle}`)) {
					knitout.push(`miss ${dir} f${x} ${carrier}`);
				}
			}
			if (inhook && x === last) {
				knitout.push(`releasehook ${carrier}`);
				inhook = false;
			}
		};

		if (stData) {
			patterns = filterData(stData, el => el.rows.hasOwnProperty(`${row_count}`) && el.rowDone === false && (el.carrier == carrier || el.carrier == null || (!rows[row_count - 1].some(pass => pass[0][1] == el.carrier) && el.prevDir !== dir))); //new: `|| el.carrier == null`
			
			if (patterns.length) {
				includesPattern = true;

				for (let p = 0; p < patterns.length; ++p) {
					if (patterns[p].carrier !== null && patterns[p].carrier !== carrier) {
						let tracked_end_needle = (dir === '+' ? patterns[p].rows[row_count][patterns[p].rows[row_count].length - 1] : patterns[p].rows[row_count][0]); //come back!
						if (!carrier_track.some((el) => el.CARRIER == patterns[p].carrier)) {
							carrier_track.push(
								FINDMYCARRIER({
									CARRIER: patterns[p].carrier,
									DIR: dir,
									END_NEEDLE: tracked_end_needle
								})
							);
							initial_carriers.push(
								FINDMYCARRIER({
									CARRIER: patterns[p].carrier,
									DIR: dir,
									END_NEEDLE: tracked_end_needle
								})
							);
							colorwork_carriers.push(patterns[p].carrier);
							let start_needle = (dir === '-' ? patterns[p].rows[row_count][patterns[p].rows[row_count].length - 1] : patterns[p].rows[row_count][0]); //come back!
							let prev_needle = (dir === '-' ? pieceWidth : 1); //come back!
							if (Math.abs(prev_needle - start_needle) > 4) {
								patterns[p]['bringInFrom'] = prev_needle;
							}
						} else {
							let prev_idx = carrier_track.findIndex((obj) => obj.CARRIER == patterns[p].carrier);
							let start_needle = (dir === '-' ? patterns[p].rows[row_count][patterns[p].rows[row_count].length - 1] : patterns[p].rows[row_count][0]); //come back!
							if (Math.abs(carrier_track[prev_idx].END_NEEDLE - start_needle) > 4) {
								patterns[p]['bringInFrom'] = carrier_track[prev_idx].END_NEEDLE;
							}
							carrier_track[prev_idx].DIR = dir; //check
							carrier_track[prev_idx].END_NEEDLE = tracked_end_needle;
						}
					}
				}
			} else includesPattern = false;
		}

		let startNeedles = [];

		if (dir === '+') { //TODO: get needlesToAvoid at beginning... so maybe get patKnitouts (but for each carrier) at the beginning? and then insert them in? (e.g. `if (pass_count === 0)` [then reset `patKnitouts = []` when reset pass_count to 0]) #wait no! avoid should be a separate function that is called then (export from stitch-pattern-library)
			if (includesPattern) { //*
				if (patterns.length > 1) {
					patterns.sort((a, b) => {return a.rows[row_count][0] - b.rows[row_count][0];}); //sort from lowest first needle to highest
				}

				// check to see if there are gaps in the pattern
				let ogPatsLen = patterns.length;
					
				for (let p = 0; p < ogPatsLen; ++p) {
					let patCopy,
						patCopy1;
					
					for (let pn = 0; pn < patterns[p].rows[row_count].length; ++pn) {
						if (pn < (patterns[p].rows[row_count].length - 1)) {
							if (patterns[p].rows[row_count][pn + 1] - patterns[p].rows[row_count][pn] > 1) { //gap
								if (!patCopy1) { //TODO: deal with xfers if necessary
									patCopy1 = JSON.parse(JSON.stringify(patterns[p])); //for deep copy
									
									let otherNs = patCopy1.rows[row_count].splice(pn + 1);
									patCopy = JSON.parse(JSON.stringify(patterns[p])); //for deep copy
									patCopy.rows[row_count] = otherNs;
								} else {
									let otherNs = patCopy.rows[row_count].splice(patCopy.rows[row_count].indexOf(patterns[p].rows[row_count][pn + 1]));
									patterns.push(patCopy);
									patCopy = JSON.parse(JSON.stringify(patCopy)); //for deep copy
									patCopy.rows[row_count] = otherNs;
								}
							}
						} else if (patCopy1) {
							patterns.push(patCopy);
							patterns[p] = patCopy1;
						}
					}	
				}

				for (let p = 0; p < patterns.length; ++p) {
					startNeedles.push(patterns[p].rows[row_count][0]);
				}
			}
			
			let finishedPatIds = [];
			for (let x = 1; x <= pieceWidth; ++x) {
				end_needle = pieceWidth;

				if (includesPattern) { //*
					if (startNeedles.includes(x)) {
						let p = startNeedles.indexOf(x);
						
						let st = stData.findIndex(el => el.id === patterns[p].id);
						stData[st].prevDir = dir;

						let endNeedle = patterns[p].rows[row_count][patterns[p].rows[row_count].length - 1];
						if (patterns[p].hasOwnProperty('bringInFrom')) {
							knitout.push(';bring in carrier for pattern');
							if (patterns[p].bringInFrom > x) {
								for(let px = patterns[p].bringInFrom; px > x; --px) {
									if (px % 3 === 0) knitout.push(`knit - b${px} ${patterns[p].carrier}`); //TODO: test out tuck
								}
							} else {
								for (let px = patterns[p].bringInFrom; px < x; ++px) {
									if (px % 3 === 0) knitout.push(`knit + b${px} ${patterns[p].carrier}`); //TODO: test out tuck
								}
							}
						}

						let backpassCarrier = carrier_track.find(c => c.CARRIER !== patterns[p].carrier && c.CARRIER !== carrier); //doesn't matter which carrier, as long as passes test
						
						let pat_row_count = (!finishedPatIds.includes(patterns[p].id) ? stData[st].completed : stData[st].completed-1); //-1 since already these
						knitout.push(patternLibrary.generatePattern(patterns[p], pat_row_count, x, endNeedle, patterns[p].rows[row_count], true, dir, speed_number, stitch_number, roller_advance, pieceWidth, carrier, backpassCarrier, passes_per_row[row_count - 1], stData[st].rows[row_count-1], stData[st].rows[row_count+1]));

						if (!finishedPatIds.includes(patterns[p].id)) {
							stData[st].rowDone = true;
							++stData[st].completed; //TODO: adjust this!

							if (stData[st].name.includes('Buttonholes')) stData[st].action = (stData[st].action === 'bindoff' ? ('caston') : ('bindoff'));

							finishedPatIds.push(patterns[p].id);
						}

						if (frontOnlyPatterns.includes(patterns[p].name)) {
							let notDefault = false;
							if (back_style === 'Minimal' || back_style === 'Secure') {
								if (x === 1) {
									stored_leftovers = [...new Set([...stored_leftovers, ...leftovers])];
									leftovers = [];
									edgeL_done = false;
									edgeR_done = false;
								}
							}
							for (let px = x; px <= endNeedle; ++px) {
								if (Object.values(patAvoidNs).some(arr => arr.includes(x) || (typeof arr[patAvoidIdx] === 'object' && arr[patAvoidIdx].includes(x)))) continue;

								if (!notDefault) {
									if (px % back_mod === pass_count) leftovers.push(px);
								} else {
									if ((i % 2 === 0 && px % 2 !== 0) || (i % 2 !== 0 && px % 2 === 0)) stored_leftovers.push(px);	
								}
							}
						}

						if (patterns[p].carrier !== null && carrier !== patterns[p].carrier) {
							for (let px = x; px <= endNeedle; ++px) {
								if (stored_leftovers.includes(px) || px % back_mod === pass_count) knitout.push(`knit + b${px} ${carrier}`);
								if (stored_leftovers.includes(px)) stored_leftovers.slice(stored_leftovers.indexOf(px), 1);
							}
						}

						x = endNeedle;
						
						continue;
					}
				}

				knitoutLines(x, pieceWidth);
			}
		} else {
			if (includesPattern) {
				if (patterns.length > 1) {
					patterns.sort((a, b) => {return b.rows[row_count][b.rows[row_count].length-1] - a.rows[row_count][a.rows[row_count].length-1];}); //check //sort from highest last needle to lowest
				} //TODO: figure out why sorting wrong


				// check to see if there are gaps in the pattern
				let ogPatsLen = patterns.length;
				for (let p = 0; p < ogPatsLen; ++p) {
					let patCopy,
						patCopy1;
					
					for (let pn = 0; pn < patterns[p].rows[row_count].length; ++pn) {
						if (pn < (patterns[p].rows[row_count].length - 1)) {
							if (patterns[p].rows[row_count][pn + 1] - patterns[p].rows[row_count][pn] > 1) { //gap
								if (!patCopy1) { //TODO: deal with xfers if necessary
									patCopy1 = JSON.parse(JSON.stringify(patterns[p])); //for deep copy
									let otherNs = patCopy1.rows[row_count].splice(pn + 1);
									patCopy = JSON.parse(JSON.stringify(patterns[p])); //for deep copy
									patCopy.rows[row_count] = otherNs;
								} else {
									let otherNs = patCopy.rows[row_count].splice(patCopy.rows[row_count].indexOf(patterns[p].rows[row_count][pn + 1]));
									patterns.push(patCopy);
									patCopy = JSON.parse(JSON.stringify(patCopy)); //for deep copy
									patCopy.rows[row_count] = otherNs;
								}
							}
						} else {
							if (patCopy1) {
								patterns.push(patCopy);
								patterns[p] = patCopy1; //new //check
							}
						}
					}	
				}

				for (let p = 0; p < patterns.length; ++p) {
					startNeedles.push(patterns[p].rows[row_count][patterns[p].rows[row_count].length - 1]);
				}
				
			}
			
			let finishedPatIds = [];
			for (let x = pieceWidth; x > 0; --x) {
				if (i === 0 || i === 1) if (machine.includes('kniterate') || (machine.includes('shima') && pieceWidth % 2 === 0)) neg_carrier = carrier;

				end_needle = 1;

				if (includesPattern) {
					if (startNeedles.includes(x)) {
						let p = startNeedles.indexOf(x);

						let st = stData.findIndex(el => el.id === patterns[p].id);
						stData[st].prevDir = dir;
						let endNeedle = patterns[p].rows[row_count][0];

						if (patterns[p].hasOwnProperty('bringInFrom')) {
							knitout.push(';bring in carrier for pattern');
							if (patterns[p].bringInFrom > x) {
								for(let px = patterns[p].bringInFrom; px > x; --px) {
									if (px % 3 === 0) knitout.push(`knit - b${px} ${patterns[p].carrier}`); //TODO: test out tuck
								}
							} else {
								for (let px = patterns[p].bringInFrom; px < x; ++px) {
									if (px % 3 === 0) knitout.push(`knit + b${px} ${patterns[p].carrier}`); //TODO: test out tuck
								}
							}
						}

						let backpassCarrier = carrier_track.find(c => c.CARRIER !== patterns[p].carrier && c.CARRIER !== carrier); //doesn't matter which carrier, as long as passes test
						
						let pat_row_count = (!finishedPatIds.includes(patterns[p].id) ? stData[st].completed : stData[st].completed-1); //-1 since already these
						knitout.push(patternLibrary.generatePattern(patterns[p], pat_row_count, endNeedle, x, patterns[p].rows[row_count], true, dir, speed_number, stitch_number, roller_advance, pieceWidth, carrier, backpassCarrier, passes_per_row[row_count - 1], stData[st].rows[row_count-1], stData[st].rows[row_count+1]));

						if (!finishedPatIds.includes(patterns[p].id)) {
							stData[st].rowDone = true;
							++stData[st].completed; //TODO: adjust this!

							if (stData[st].name.includes('Buttonholes')) stData[st].action = (stData[st].action === 'bindoff' ? ('caston') : ('bindoff'));

							finishedPatIds.push(patterns[p].id);
						}

						if (frontOnlyPatterns.includes(patterns[p].name)) { //*
							let notDefault = false;
							if (back_style === 'Minimal' || back_style === 'Secure') { //TODO: //check
								if (x === pieceWidth) {
									stored_leftovers = [...new Set([...stored_leftovers, ...leftovers])];
									leftovers = [];
									edgeL_done = false;
									edgeR_done = false;
								}
							}
							for (let px = x; px >= endNeedle; --px) {
								if (Object.values(patAvoidNs).some(arr => arr.includes(x) || (typeof arr[patAvoidIdx] === 'object' && arr[patAvoidIdx].includes(x))));
								if (!notDefault) {
									if (px % back_mod === pass_count) leftovers.push(px);
								} else {
									if ((i % 2 === 0 && px % 2 !== 0) || (i % 2 !== 0 && px % 2 === 0)) stored_leftovers.push(px);	
								}
							}
						}

						if (patterns[p].carrier !== null && carrier !== patterns[p].carrier) {
							for (let px = x; px >= endNeedle; --px) {
								if (stored_leftovers.includes(px) || px % back_mod === pass_count) knitout.push(`knit - b${px} ${carrier}`);
								if (stored_leftovers.includes(px)) stored_leftovers.slice(stored_leftovers.indexOf(px), 1);
							}
						}

						x = endNeedle;

						continue;
					}
				}

				knitoutLines(x, 1);
			}
		}
		++pass_count;
	}


	if (stData) knitout = knitout.flat();
	// ----------------------------------

	double_bed = (knitout.some((el) => el.includes('knit') && el.includes(' b')) ? true : false); //TODO: make this not fake (maybe add option for single bed?)

	let carriers_arr = [];
	let carriers_str = '';
	let max_carriers;
	machine.includes('kniterate') ? (max_carriers = 6) : (max_carriers = 10); //TODO: add more options for this, or maybe take it from command-line input (i.e. stoll machines have anywhere from 8 - 16 carriers [maybe even > || < for some])
	for (let i = 1; i <= max_carriers; ++i) {
		carriers_str = `${carriers_str} ${i}`;
		carriers_arr.push(i);
	}
	if (machine.includes('shima')) {
		caston = [...neg_caston, ...pos_caston];
		caston.unshift(`inhook ${caston_carrier}`);
		caston.push(`releasehook ${caston_carrier}`);
		knitout.unshift(caston);
	} else if (machine.includes('kniterate')) {
		
		caston = [...pos_caston, ...neg_caston]; ////so, if not less than 20, this section is length of real section
		let waste_stitches = 20;
		for (let w = pieceWidth; w > waste_stitches; --w) {
			pos_caston = pos_caston.filter((el) => !el.includes(`f${w}`) && !el.includes(`b${w}`));
			neg_caston = neg_caston.filter((el) => !el.includes(`f${w}`) && !el.includes(`b${w}`));
		}
		
		if (pieceWidth < 20) {
			for (let x = pieceWidth + 1; x <= 20; ++x) {
				x % 2 === 0 ? pos_caston.push(`knit + b${x} ${caston_carrier}`) : pos_caston.push(`knit + f${x} ${caston_carrier}`);
				x % 2 !== 0 ? neg_caston.unshift(`knit - b${x} ${caston_carrier}`) : neg_caston.unshift(`knit - f${x} ${caston_carrier}`);
			}
			caston = [...pos_caston, ...neg_caston];
		}
			
		draw: for (let i = initial_carriers.length - 1; i >= 0; --i) { //loop backwards so draw thread is future color in piece
			if (initial_carriers[i].CARRIER != waste_carrier && initial_carriers[i].CARRIER != caston_carrier && initial_carriers[i].CARRIER != rib_bottom) {
				draw_thread = initial_carriers[i].CARRIER;
				if (initial_carriers[i].CARRIER == rib_bottom) draw_dir = '+';
				else draw_dir = (initial_carriers[i].DIR === '+' ? '-' : '+');
				break draw;
			}
		}

		colors: for (let i = 0; i <= color_count; ++i) { // <= because add extra one for draw thread
			if (i === color_count && !patternCarriers.length && !user_specified_carriers.length) break colors;

			if (i === 6) { //TODO: adapt this for shima
				////bc if all carriers in use, definitely don't have extra carrier for drawthread
				break colors;
			}

			if (i < color_count) {
				carrier = carriers_arr[i];
				if (patternCarriers.includes(carrier)) patternCarriers.splice(patternCarriers.indexOf(carrier), 1);
				if (user_specified_carriers.includes(carrier)) user_specified_carriers.splice(user_specified_carriers.indexOf(carrier), 1);
			} else {
				if (patternCarriers.length) {
					carrier = patternCarriers.shift();
					--i; //to check again for patternCarriers/user_specified_carriers
				} else if (user_specified_carriers.length) {
					carrier = user_specified_carriers.shift();
					--i;
				}
			}

			color_carriers.push(carrier);
			let yarn_in = `in ${carrier}`;
			let pos_carrier_caston = [];
			let neg_carrier_caston = [];
			let b = 'f';
			if (pieceWidth >= 20) {
				for (let n = Number(carrier); n <= pieceWidth; n += carriers_arr.length) {
					pos_carrier_caston.push(`knit + ${b}${n} ${carrier}`);
					b === 'f' ? (b = 'b') : (b = 'f');
					neg_carrier_caston.unshift(`knit - ${b}${n} ${carrier}`);
				}
				if (Number(carrier) !== 1) neg_carrier_caston.push(`miss - f1 ${carrier}`);
			} else {
				if (pieceWidth < 20) {
					for (let n = 1; n <= pieceWidth; ++n) {
						pos_carrier_caston.push(`knit + ${b}${n} ${carrier}`);
						b === 'f' ? (b = 'b') : (b = 'f');
						neg_carrier_caston.unshift(`knit - ${b}${n} ${carrier}`);
					}
				}
			}
			
			let caston_count;
			pieceWidth < 40 ? (caston_count = 3) : (caston_count = 2);
			kniterate_caston.push(yarn_in); //TODO: add extra pos pass for carriers that start in neg direction, so don't need to worry about back pass (make sure this doesn't impact waste yarn & draw thread carriers tho)
			for (let p = 0; p < caston_count; ++p) {
				kniterate_caston.push(pos_carrier_caston, neg_carrier_caston);
			}
			
			if (
				colorwork_carriers.includes(carrier) &&
				carrier !== caston_carrier &&
				carrier !== waste_carrier &&
				carrier !== draw_thread &&
				initial_carriers[initial_carriers.findIndex((el) => el.CARRIER === carrier)].DIR === '-' //if starts negative
			) {
				if (!pos_carrier_caston[pos_carrier_caston.length - 1].includes(pieceWidth)) pos_carrier_caston.push(`miss + f${pieceWidth} ${carrier}`);
				kniterate_caston.push(pos_carrier_caston);
			} else if (
				colorwork_carriers.includes(carrier) &&
				carrier === caston_carrier &&
				initial_carriers[initial_carriers.findIndex((el) => el.CARRIER === carrier)].DIR === '+' //if starts positive
			) {
				if (caston_carrier !== rib_bottom) {
					negCaston = true;
					if (caston_carrier !== waste_carrier) {
						if (!pos_carrier_caston[pos_carrier_caston.length - 1].includes(pieceWidth)) pos_carrier_caston.push(`miss + f${pieceWidth} ${carrier}`);
						kniterate_caston.push(pos_carrier_caston);
					}
				}
			} else if ((carrier === rib_bottom && carrier !== draw_thread && carrier !== caston_carrier && carrier !== waste_carrier) || (carrier === draw_thread && draw_dir === '-')) {
				if (!pos_carrier_caston[pos_carrier_caston.length - 1].includes(pieceWidth)) pos_carrier_caston.push(`miss + f${pieceWidth} ${carrier}`);
				kniterate_caston.push(pos_carrier_caston);
			}
		}

		if (draw_thread === undefined) {
			draw_thread = carriers_arr.find(el => !color_carriers.includes(el));
			color_carriers.push(draw_thread);
			if (draw_thread === undefined) { //if no extra carriers available
				draw_thread = waste_carrier;
				if (colorwork_carriers.includes(waste_carrier)) {
					draw_dir = (initial_carriers[initial_carriers.findIndex((el) => el.CARRIER === waste_carrier)].DIR === '+' ? '-' : '+');
				} else draw_dir = '-';
			} else {
				draw_dir = '-';
				let yarn_in = `in ${draw_thread}`;
			
				let pos_carrier_caston = [];
				let neg_carrier_caston = [];
				let b = 'f';
				if (pieceWidth >= 20) {
					for (let n = Number(draw_thread); n <= pieceWidth; n += carriers_arr.length) {
						pos_carrier_caston.push(`knit + ${b}${n} ${draw_thread}`);
						b === 'f' ? (b = 'b') : (b = 'f');
						neg_carrier_caston.unshift(`knit - ${b}${n} ${draw_thread}`);
					}
					if (Number(draw_thread) !== 1) neg_carrier_caston.push(`miss - f1 ${draw_thread}`);
				} else {
					if (pieceWidth < 20) {
						for (let n = 1; n <= pieceWidth; ++n) {
							pos_carrier_caston.push(`knit + ${b}${n} ${draw_thread}`);
							b === 'f' ? (b = 'b') : (b = 'f');
							neg_carrier_caston.unshift(`knit - ${b}${n} ${draw_thread}`);
						}
					}
				}
				
				let caston_count;
				pieceWidth < 40 ? (caston_count = 3) : (caston_count = 2);
				kniterate_caston.push(yarn_in); //TODO: add extra pos pass for carriers that start in neg direction, so don't need to worry about back pass (make sure this doesn't impact waste yarn & draw thread carriers tho)
				for (let p = 0; p < caston_count; ++p) {
					kniterate_caston.push(pos_carrier_caston, neg_carrier_caston);
				}
				if (!pos_carrier_caston[pos_carrier_caston.length - 1].includes(pieceWidth)) pos_carrier_caston.push(`miss + f${pieceWidth} ${draw_thread}`);
				kniterate_caston.push(pos_carrier_caston); //since draw dir == '-'
			}
		}
		//TODO: figure out issue where extra waste carrier isn't being brought in
		kniterate_caston.push(';kniterate yarns in');
		kniterate_caston = kniterate_caston.flat();

		carrier = waste_carrier;
		let waste_yarn = caston.map((el) => el.replace(` ${el.charAt(el.length - 1)}`, ` ${carrier}`));
		waste_yarn_section.push(`x-stitch-number ${waste_stitch}`);
		waste_yarn_section.push(`x-speed-number ${waste_speed}`);
		waste_yarn_section.push(`x-roller-advance ${waste_roller}`);

		for (let i = 0; i < waste_rows; ++i) { //70 total passes (35 rows)
			waste_yarn_section.push(waste_yarn);
		}

		if (pieceWidth < 20) { //TODO: add something like this to shapeify
			waste_yarn_section.push('x-roller-advance 50');
			for (let i = 0; i < 2; ++i) {
				for (let x = pieceWidth + 1; x <= 20; ++x) {
					waste_yarn_section.push(`drop f${x}`);
				}
				for (let x = 20; x > pieceWidth; --x) {
					waste_yarn_section.push(`drop b${x}`);
				}
			}
			waste_yarn_section.push(';dropped extra needles');
		}
		
		waste_yarn_section.push('x-roller-advance 100');

		let extra_pos_waste_pass = false;
		if ((colorwork_carriers.includes(carrier) && initial_carriers[initial_carriers.findIndex((el) => el.CARRIER === carrier)].DIR === '-') || (rib_bottom !== null && carrier === rib_bottom)) { //if starts negative)
			if (waste_carrier !== caston_carrier) extra_pos_waste_pass = true;
		} else {
			if (waste_carrier === caston_carrier) extra_pos_waste_pass = true;
		}

		if (waste_carrier === draw_thread) {
			if (draw_dir === '-') extra_pos_waste_pass = true;
		}

		for (let i = 0; i < 14; ++i) {
			(i % 2 !== 0 && i < 13) ? (dir = '-') : (dir = '+');
			if (i === 8 && colorwork_carriers.includes(carrier)) waste_yarn_section.push(`pause switch C${carrier}`);

			if (i === 13) {
				if (speed_number < 400) waste_yarn_section.push(`x-speed-number ${speed_number}`);
				waste_yarn_section.push(`;draw thread: ${draw_thread}`);
				if (draw_dir === '-') dir = '-';
			}

			if (dir === '+') {
				for (let x = 1; x <= pieceWidth; ++x) {
					if (i === 13 && draw_dir === '+') {
						waste_yarn_section.push(`knit + f${x} ${draw_thread}`); ////draw thread
					} else if (i < 13) {
						(i !== 12) ? waste_yarn_section.push(`knit + f${x} ${carrier}`) : waste_yarn_section.push(`drop b${x}`);
					}
				}
			} else {
				for (let x = pieceWidth; x > 0; --x) {
					if (i < 11 || (i === 11 && !extra_pos_waste_pass)) waste_yarn_section.push(`knit - b${x} ${carrier}`);
					else if (i === 13 && draw_dir === '-') waste_yarn_section.push(`knit - f${x} ${draw_thread}`); //draw thread
				}
			}
		}

		carrier = caston_carrier;
		if (rib_bottom !== null && carrier === rib_bottom) negCaston = false;
		
		waste_yarn_section.push(`x-stitch-number ${main_stitch_number}`, `x-roller-advance ${roller_advance}`);

		if (stitchOnly && frontOnlyPatterns.includes(stData[0].name) && rib_bottom === null && stData[0].rows['1']) { //single bed cast-on //TODO: have separate double bed caston for ranges of needle not in stData[0].rows['1'], if applicable.
			waste_yarn_section.push(';single bed cast-on');
			for (let x = 1; x <= pieceWidth; ++x) {
				if (x % 2 == 0) waste_yarn_section.push(`knit + f${x} ${carrier}`);
				else if (x == pieceWidth || x === 1) waste_yarn_section.push(`miss + f${x} ${carrier}`); //x === 1 so shapeify knows 1 is the left-most needle
			}
			for (let x = pieceWidth; x > 0; --x) {
				if (x % 2 != 0) waste_yarn_section.push(`knit - f${x} ${carrier}`);
				else if (x == 1) waste_yarn_section.push(`miss - f${x} ${carrier}`);
			}
			if (!negCaston) {
				for (let x = 1; x <= pieceWidth; ++x) { //extra pass to get it on expected side
					waste_yarn_section.push(`knit + f${x} ${carrier}`);
				}
			}
		} else {
			waste_yarn_section.push('rack 0.25'); //aka rack 0.5 for kniterate

			if (negCaston) {
				for (let x = pieceWidth; x >= 1; --x) {
					waste_yarn_section.push(`knit - b${x} ${carrier}`);
					waste_yarn_section.push(`knit - f${x} ${carrier}`);
				}
			} else { //new
				for (let x = 1; x <= pieceWidth; ++x) {
					waste_yarn_section.push(`knit + f${x} ${carrier}`);
					waste_yarn_section.push(`knit + b${x} ${carrier}`);
				}
			}
			waste_yarn_section.push('rack 0');
		}
		
		let addSafetyPasses = false; //TODO: make this optional / based on user input
		if (stitchOnly && addSafetyPasses) { //so don't have to worry about messiness //TODO: remove this?
			for (let r = 0; r < 4; ++r) {
				if ((r % 2 === 0 && negCaston) || (r % 2 !== 0 && !negCaston)) {
					for (let x = 1; x <= pieceWidth; ++x) {
						waste_yarn_section.push(`knit + b${x} ${carrier}`);
					}
				} else {
					for (let x = pieceWidth; x >= 1; --x) {
						waste_yarn_section.push(`knit - f${x} ${carrier}`);
					}
				}
			}
		}

		waste_yarn_section = waste_yarn_section.flat();
	}


	// --------------------------------------------------
	const RIB = (arr, carrier, dir1, dir2, rib_rows) => {
		const POSRIB = (bed, modulo) => {
			for (let n = 1; n <= pieceWidth; ++n) {
				if (modulo === 'even') {
					if (n % 2 === 0) arr.push(`knit + ${bed}${n} ${carrier}`);
				} else if (modulo === 'odd') {
					if (n % 2 !== 0) arr.push(`knit + ${bed}${n} ${carrier}`);
				} else if (modulo === 'alt') {
					if (n % 2 !== 0) {
						arr.push(`knit + b${n} ${carrier}`);
					} else {
						arr.push(`knit + f${n} ${carrier}`);
					}
				} else {
					arr.push(`knit + ${bed}${n} ${carrier}`);
				}
			}
		};

		const NEGRIB = (bed, modulo) => {
			for (let n = pieceWidth; n >= 1; --n) {
				if (modulo === 'even') {
					if (n % 2 === 0) arr.push(`knit - ${bed}${n} ${carrier}`);
				} else if (modulo === 'odd') {
					if (n % 2 !== 0) arr.push(`knit - ${bed}${n} ${carrier}`);
				} else if (modulo === 'alt') {
					if (n % 2 !== 0) {
						arr.push(`knit - b${n} ${carrier}`);
					} else {
						arr.push(`knit - f${n} ${carrier}`);
					}
				} else {
					arr.push(`knit - ${bed}${n} ${carrier}`);
				}
			}
		};

		arr.push(';begin rib');
		for (let r = 0; r < 2; ++r) {
			dir1 === '-' ? (NEGRIB('b'), POSRIB('f')) : (POSRIB('b'), NEGRIB('f')); // just some plain knitting
		}

		arr.push(`x-speed-number ${xfer_speed}`);
		for (let n = pieceWidth; n >= 1; --n) {
			////doesn't rly matter direction for xfer
			if (n % 2 === 0) arr.push(`xfer b${n} f${n}`);
		}

		for (let n = 1; n <= pieceWidth; ++n) {
			if (n % 2 !== 0) arr.push(`xfer f${n} b${n}`);
		}

		arr.push(`x-speed-number ${speed_number}`, `x-stitch-number ${Math.ceil(main_stitch_number / 2)}`); ////calculate rib stitch number based on actual stitch number //TODO: determine if should be main_stitch_number or stitch_number
		rib_loop: for (let r = 0; r < rib_rows / 2; ++r) {
			dir1 === '-' ? NEGRIB('b', 'alt') : POSRIB('b', 'alt');
			if (r === rib_rows / 2 - 2 && bot_dir_switch) {
				[dir1, dir2] = [dir2, dir1];
				break rib_loop;
			}
			dir2 === '-' ? NEGRIB('b', 'alt') : POSRIB('b', 'alt');
		}

		arr.push(`x-stitch-number ${main_stitch_number}`);
		for (let r = 0; r < 4; ++r) {
			dir1 === '-' ? (NEGRIB('b'), POSRIB('f')) : (POSRIB('b'), NEGRIB('f'));
		}
		if (!double_bed) {
			arr.push(`x-speed-number ${xfer_speed}`);
			for (let n = pieceWidth; n >= 1; --n) {
				arr.push(`xfer b${n} f${n}`);
			}
		}
		arr.push(`x-speed-number ${speed_number}`, ';end rib');
	};
	
	if (rib_bottom !== null) {
		if (colorwork_carriers.includes(rib_bottom) && initial_carriers[initial_carriers.findIndex((el) => el.CARRIER == rib_bottom)].DIR === '+') bot_dir_switch = true;
		RIB(rib_arr, rib_bottom, '-', '+', ribB_rows);
		knitout.unshift(rib_arr);
	}
	if (machine.includes('kniterate')) {
		knitout.unshift(waste_yarn_section);
		knitout.unshift(kniterate_caston);
	}
	
	knitout.unshift(`;background color: ${background}`);
	
	for (let d = colors_data.length - 1; d >= 0; --d) {
		knitout.unshift(colors_data[d]);
	}
	
	if (back_style === 'Secure') knitout.unshift('x-carrier-spacing 1.5');
	if (stitchOnly) knitout.unshift('x-roller-advance 300');
	else knitout.unshift('x-roller-advance 100');

	knitout.unshift(`x-speed-number ${speed_number}`);
	knitout.unshift(`x-stitch-number ${main_stitch_number}`);
	knitout.unshift(';!knitout-2', `;;Machine: ${machine}`, `;;Carriers:${carriers_str}`);
	last_needle = pieceWidth;

	if (rib_top !== null) {
		bindoff_carrier = rib_top;
		bot_dir_switch = false;
		let rib1_dir;
		if (colorwork_carriers.includes(rib_top)) {
			carrier_track[carrier_track.findIndex((el) => el.CARRIER == rib_top)].DIR === '+'
				? ((rib1_dir = '-'), (last_pass_dir = '+'), (xfer_needle = last_needle))
				: ((rib1_dir = '+'), (last_pass_dir = '-'), (xfer_needle = 1));
		} else {
			rib1_dir = '+';
			last_pass_dir = '-';
			xfer_needle = 1;
		}

		RIB(knitout, rib_top, rib1_dir, last_pass_dir, ribT_rows);
	} else {
		findLastCarrier: for (let ln = knitout.length - 1; ln > 0; --ln) {
			if (knitout[ln].includes('knit ')) {
				let lastCInfo = knitout[ln].split(' ');
				bindoff_carrier = lastCInfo[3];
				bindCLastN = Number(lastCInfo[2].slice(1));
				last_pass_dir = lastCInfo[1];
				xfer_needle = (last_pass_dir === '+' ? (last_needle) : 1);
				break findLastCarrier;
			}
		}
	}

	// ---------------
	// *** BINDOFF ***
	// ---------------
	let side = (last_pass_dir === '+' ? ('right') : ('left'));

	if (Math.abs(xfer_needle-bindCLastN) > 3) { //knit to get it in place
		bindoff.push('rack 0.25');

		if (side === 'left') {
			for (let n = bindCLastN-1; n >= xfer_needle; --n) {
				bindoff.push(`knit - b${n} ${bindoff_carrier}`);
				bindoff.push(`knit - f${n} ${bindoff_carrier}`);
			}
		} else {
			for (let n = bindCLastN+1; n <= xfer_needle; ++n) {
				bindoff.push(`knit + f${n} ${bindoff_carrier}`);
				bindoff.push(`knit + b${n} ${bindoff_carrier}`);
			}
		}
		bindoff.push('rack 0');
	}

	bindoff.push(';bindoff section', 'pause bindoff', `x-stitch-number ${main_stitch_number}`, `x-speed-number ${xfer_speed}`, 'x-roller-advance 100');

	bindoff.push(`x-xfer-stitch-number ${Math.ceil(main_stitch_number/2)}`);

	let count = last_needle;
	if (side === 'right') {
		xfer_needle = xfer_needle - count + 1;
	}
	const posLoop = (op, bed) => {
		pos: for (let x = xfer_needle; x < xfer_needle + count; ++x) {
			if (op === 'knit') {
				bindoff.push(`knit + ${bed}${x} ${bindoff_carrier}`);
			}
			if (op === 'xfer') {
				let receive;
				bed === 'f' ? (receive = 'b') : (receive = 'f');
				bindoff.push(`xfer ${bed}${x} ${receive}${x}`);
			}
			if (op === 'bind') {
				if (x === xfer_needle + count - 1) {
					break pos;
				}
				bindoff.push(`xfer b${x} f${x}`);
				bindoff.push('rack -1');
				
				bindoff.push(`xfer f${x} b${x + 1}`);
				bindoff.push('rack 0');
				if (x !== xfer_needle) {
					if (x > xfer_needle + 3) {
						if ((x-xfer_needle) === 30) bindoff.push('x-add-roller-advance -500'); //TODO: //check on machine
						else bindoff.push('x-add-roller-advance -50'); //to have 0 roller-advance for tuck
					}
					bindoff.push(`drop b${x - 1}`);
				}
				bindoff.push(`knit + b${x + 1} ${bindoff_carrier}`);
				if (x < xfer_needle + count - 2) bindoff.push(`tuck - b${x} ${bindoff_carrier}`);
				if (x === xfer_needle + 3) bindoff.push(`drop b${xfer_needle - 1}`); ////don't drop fix tuck until 3 bindoffs (& let it form a loop for extra security) //check 3
			}
		}
	};


	const negLoop = (op, bed) => {
		neg: for (let x = xfer_needle + count - 1; x >= xfer_needle; --x) {
			if (op === 'knit') {
				bindoff.push(`knit - ${bed}${x} ${bindoff_carrier}`);
			}
			if (op === 'xfer') {
				let receive;
				bed === 'f' ? (receive = 'b') : (receive = 'f');
				bindoff.push(`xfer ${bed}${x} ${receive}${x}`);
			}
			if (op === 'bind') {
				if (x === xfer_needle) {
					break neg;
				}
				bindoff.push(`xfer b${x} f${x}`);
				bindoff.push('rack 1');
				bindoff.push(`xfer f${x} b${x - 1}`);
				bindoff.push('rack 0');
				if (x !== xfer_needle + count - 1) {
					if (x < xfer_needle + count - 4) {
						if (((xfer_needle + count)-x) === 30) bindoff.push('x-add-roller-advance -500'); //new //TODO: //check on machine //TODO: maybe just have all of them be -500 (or -200) after this point? or maybe start -20 after 10?
						else bindoff.push('x-add-roller-advance -50');
					}
					bindoff.push(`drop b${x + 1}`);
				}
				bindoff.push(`knit - b${x - 1} ${bindoff_carrier}`);
				if (x > xfer_needle + 1) bindoff.push(`tuck + b${x} ${bindoff_carrier}`);
				if (x === xfer_needle + count - 4) bindoff.push(`drop b${xfer_needle + count}`); ////don't drop fix tuck until 3 bindoffs (& let it form a loop for extra security) //check 4
			}
		}
	};


	const bindoffTail = (last_needle, dir) => {
		bindoff.push(';tail');
		let otherT_dir, miss1, miss2;
		dir === '+' ? ((otherT_dir = '-'), (miss1 = last_needle + 1), (miss2 = last_needle - 1)) : ((otherT_dir = '+'), (miss1 = last_needle - 1), (miss2 = last_needle + 1));
		bindoff.push('x-roller-advance 200');
		bindoff.push(`miss ${dir} b${miss1} ${bindoff_carrier}`);
		bindoff.push('pause tail?');
		for (let i = 0; i < 6; ++i) {
			bindoff.push(`knit ${otherT_dir} b${last_needle} ${bindoff_carrier}`);
			bindoff.push(`miss ${otherT_dir} b${miss2} ${bindoff_carrier}`);
			bindoff.push(`knit ${dir} b${last_needle} ${bindoff_carrier}`);
			bindoff.push(`miss ${dir} b${miss1} ${bindoff_carrier}`);
		}
		bindoff.push('x-add-roller-advance 200');
		bindoff.push(`drop b${last_needle}`);
	};


	if (side === 'left') {
		if (!rib_top) posLoop('knit', 'f');
		if (double_bed) {
			if (!rib_top) negLoop('knit', 'b');
			negLoop('xfer', 'f');
		} else {
			if (!rib_top) negLoop('knit', 'f');
		}
		bindoff.push('x-roller-advance 50');
		bindoff.push('x-add-roller-advance -50');
		bindoff.push(`tuck - b${xfer_needle - 1} ${bindoff_carrier}`);
		bindoff.push(`knit + b${xfer_needle} ${bindoff_carrier}`);
		bindoff.push(`knit + b${xfer_needle+1} ${bindoff_carrier}`); // used to be twisted stitch (so -), but that made the stitch drop //TODO: //check on machine //* //maybe add miss - //?
		posLoop('bind', null);
		bindoffTail(xfer_needle + count - 1, '+');
	} else if (side === 'right') {
		negLoop('knit', 'f');
		if (double_bed) {
			posLoop('knit', 'b');
			posLoop('xfer', 'f');
		} else {
			posLoop('knit', 'f');
		}
		bindoff.push('x-roller-advance 50');
		bindoff.push('x-add-roller-advance -50');
		bindoff.push(`tuck + b${xfer_needle + count} ${bindoff_carrier}`);
		bindoff.push(`knit - b${xfer_needle + count - 1} ${bindoff_carrier}`);
		bindoff.push(`knit - b${xfer_needle + count - 2} ${bindoff_carrier}`); // used to be twisted stitch (so +), but that made the stitch drop //TODO: //check on machine //* //maybe add miss + //?
		negLoop('bind', null);
		bindoffTail(xfer_needle, '-');
	}
	
	//TODO: add feature to pause & ask "all stitches dropped?" then miss pass with add-roller-advance 1000 or something (calculate how much is necessary based on how many rows)
	//TODO: add knitout extension to pause , along with message
	knitout.push(bindoff);
	knitout = knitout.flat();
	let yarn_out = (machine.includes('kniterate') ? 'out' : 'outhook');

	if (!machine.includes('kniterate')) {
		let potentialNewCs = [caston_carrier, waste_carrier, rib_bottom, rib_top];
		for (let i = 0; i < potentialNewCs.length; ++i) {
			if (potentialNewCs[i] !== null && !color_carriers.includes(potentialNewCs[i])) color_carriers.push(potentialNewCs[i]);
		}
	}

	let end_splice = knitout.indexOf(';tail');
	for (let i = 0; i <= color_carriers.length; ++i) {
		let carrier_search = knitout.map((el) => el.includes(` ${color_carriers[i]}`) && (el.includes('knit') || el.includes('miss')));
		let last = carrier_search.lastIndexOf(true);
		if (last !== -1) {
			if (knitout[last].includes(' - ')) {
				knitout.splice(last + 1, 0, `${yarn_out} ${color_carriers[i]}`);
				if (last + 1 < end_splice) ++end_splice;
			} else {
				let out_spot = Number(knitout[last].split(' ')[2].slice(1)) + 6;
				knitout.splice(last + 1, 0, `miss + f${out_spot} ${color_carriers[i]}`);
				if (last + 1 < end_splice) ++end_splice;
				if (color_carriers[i] != bindoff_carrier) {
					knitout.splice(end_splice, 0, `${yarn_out} ${color_carriers[i]}`);
				} else {
					knitout.push(`${yarn_out} ${color_carriers[i]}`); ////at the end
				}
			}
		}
	}
	if (!color_carriers.includes(draw_thread)) knitout.splice(end_splice, 0, `${yarn_out} ${draw_thread}`);

	// -------------------------
	// *** WRITE FINAL FINAL ***
	// -------------------------
	let knitout_str = JSON.stringify(knitout)
		.replace(/\[|\]|"/gi, '')
		.split(',');

	knitout_str = knitout_str.join('\n');

	return knitout_str;
}

//TODO: maybe add error check for this one too?

module.exports = {generateKnitout};