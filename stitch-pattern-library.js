// called with: `patternLibrary.generatePattern`

//---------------------------
//--- INITIAL VARIABLES ---//
//---------------------------
// let frontOnlyPatterns = ['Garter', 'Bubbles', 'Lace'];
let frontOnlyPatterns = ['Bubbles', 'Lace'];
let avoidAll = ['Lace']; //new

let generateKnitout;
let generated = [];
let avoidOnBack = []; //new

let speed_number, stitch_number, roller_advance, row_count, pieceWidth, extraCarrier, colCt;

let options;

let extraCarrierPasses = 0;

let leftover = false;

//-----------------------------------------
//--- FUNCTION FOR EXTRA CARRIER PASS ---//
//-----------------------------------------
function extraCarrierPass() {
	function posPass() {
		for (let n = 1; n <= pieceWidth; ++n) {
			generated.push(`knit + b${n} ${extraCarrier.CARRIER}`);
		}
	}
	function negPass() {
		for (let n = pieceWidth; n >= 1; --n) {
			generated.push(`knit - b${n} ${extraCarrier.CARRIER}`);
		}
	}
	if (extraCarrier) {
		generated.push('x-roller-advance 0'); //?
		if (extraCarrier.DIR === '+') extraCarrierPasses % 2 === 0 ? negPass() : posPass();
		else extraCarrierPasses % 2 === 0 ? posPass() : negPass();
		++extraCarrierPasses;
	}
}


//-------------
//--- RIB ---//
//-------------
// function generateRib(sequence, min, max, dir, carrier, currNs, prevNs, nextNs, frill) { //rib will need to be multiple colors, i guess //TODO: test frill
function generateRib(min, max, dir, carrier, currNs, prevNs, nextNs, frill) { //rib will need to be multiple colors, i guess //TODO: test frill
	let sequence = (options ? options.sequence : 'fb'); //*

	let f_width = sequence.match(/f/gi).length;
	let b_width = sequence.match(/b/gi).length;

	let extra_rib_f_pass_ct = 0;
	let tuckOnBack = false;
	// if (!generateKnitout && sequence.match(/f/gi).length > 4) {
	if (f_width > 4) {
		if (generateKnitout) extra_rib_f_pass_ct = 2 * Math.floor(colCt/2); //round to nearest even number (so total is odd) //extra passes to prevent yarn breakage from not enough knitting happening in the front sections
		else {
			avoidOnBack = [[], []];//TODO: maybe > 5 //?
			tuckOnBack = true;
		}
		// rib_f_pass_ct = 2 * Math.floor(colCt/2) + 1; //round to nearest odd number
		// extra_rib_f_pass_ct = 2 * Math.floor(colCt/2); //round to nearest even number (so total is odd) //extra passes to prevent yarn breakage from not enough knitting happening in the front sections
	}

	const POSRIB = (n_min, n_max, doingExtra) => {
		for (let n = n_min; n <= n_max; ++n) {
			if (sequence[n % sequence.length] === 'f') {
				if (generateKnitout) {
					generated.push(`knit + f${n} ${carrier}`);
					if (!doingExtra && extra_rib_f_pass_ct > 0 && sequence[(n+1) % sequence.length] === 'b') { // knit again!
						let extra_edge_n = ((n-f_width+1) >= n_min ? (n-f_width+1) : n_min); //TODO: check
						generated.push(";extra front rib passes");
						for (let p = 0; p < extra_rib_f_pass_ct; ++p) {
							// if (p % 2 === 0) NEGRIB(n, extra_edge_n);
							if (p % 2 === 0) NEGRIB(extra_edge_n, n, true);
							else POSRIB(extra_edge_n, n, true);
						}
					}
				} else if (currNs.includes(n)) {
					if (tuckOnBack) {
						if (n % 2 === 0) avoidOnBack[0].push(n); //don't knit these
						else avoidOnBack[1].push(n); //don't knit these
					} else avoidOnBack.push(n); //don't knit these
				}
			// } else if (generateKnitout) generated.push(`knit + b${n} ${carrier}`); //remove //?
			} else if (generateKnitout || !frill) {
				// sequence[((n/colCt) % sequence.length) * colCt]
				// if (generateKnitout && row_count <= 3) console.log('+!!!', n, (n / colCt), ((n / colCt) % sequence.length), (((n / colCt) % sequence.length) * colCt), sequence[(((n / colCt) % sequence.length) * colCt)]); //remove //debug
			// 	// if ((((n/colCt) % sequence.length) / colCt) < sequence.length) generated.push(`knit + b${n} ${carrier}`); 
				// if (sequence[(((n / colCt) % sequence.length) / colCt)] === 'b') {
				if (frill || sequence[(((n / colCt) % sequence.length) * colCt)] === 'b') { //TODO: check for ffbb
					// if (row_count <= 3) console.log('!!!', n); //remove //debug
					if (generateKnitout) generated.push(`knit + b${n} ${carrier}`); //TODO: check //if longer, will be 'undefined'
					else if (!frill && currNs.includes(n)) avoidOnBack.push(n); //don't knit these #*#*#*
				}
			}
		}
	};

	const NEGRIB = (n_min, n_max, doingExtra) => {
		for (let n = n_max; n >= n_min; --n) {
			if (sequence[n % sequence.length] === 'f') {
				if (generateKnitout) {
					generated.push(`knit - f${n} ${carrier}`);

					if (!doingExtra && extra_rib_f_pass_ct > 0 && sequence[(n-1) % sequence.length] === 'b') { // knit again!
						let extra_edge_n = ((n+f_width-1) <= n_max ? (n+f_width-1) : n_max); //TODO: check
						generated.push(";extra front rib passes");
						for (let p = 0; p < extra_rib_f_pass_ct; ++p) {
							if (p % 2 === 0) POSRIB(n, extra_edge_n, true);
							else NEGRIB(n, extra_edge_n, true);
							// else NEGRIB(extra_edge_n, n);
						}
					}
				} else if (currNs.includes(n)) {
					if (tuckOnBack) {
						if (n % 2 === 0) avoidOnBack[0].push(n); //don't knit these
						else avoidOnBack[1].push(n); //don't knit these
					} else avoidOnBack.push(n);
				}
			// } else if (generateKnitout) generated.push(`knit - b${n} ${carrier}`); //TODO: every other?
			} else if (generateKnitout || !frill) {
				// if (generateKnitout && row_count <= 3) console.log('-!!!', n, (n / colCt), ((n / colCt) % sequence.length), ((n % sequence.length) * colCt), sequence[((n % sequence.length) * colCt)]); //remove //debug

				if (frill || sequence[(((n / colCt) % sequence.length) * colCt)] === 'b') {
					generated.push(`knit - b${n} ${carrier}`); //TODO: check //if longer, will be 'undefined'
					if (!frill && currNs.includes(n)) avoidOnBack.push(n); //don't knit these #*#*#*
				}
			}
		}
	};

	if (!generateKnitout) { //new
		POSRIB(min, max); //direction doesn't matter since will return the same needles to avoid either way
		
		return avoidOnBack;
	} else {
		let xferBack = [];

		generated.push(';stitch pattern: Rib');
		let emptyNeedles = ';empty:'; //new //*

		for (let n = min; n <= max; ++n) {
			if (sequence[n % sequence.length] === 'f') emptyNeedles += ` b${n}`; //new //check
			else emptyNeedles += ` f${n}`; //new //*
		}
		generated.push(emptyNeedles); //new //*

		if (row_count === 0) {
			generated.push('x-speed-number 300', 'x-roller-advance 0');
			for (let n = max; n >= min; --n) { ////doesn't rly matter direction for xfer
				if (sequence[n % sequence.length] === 'f') generated.push(`xfer b${n} f${n}`);
			}
			for (let n = min; n <= max; ++n) {
				if (sequence[n % sequence.length] === 'b') generated.push(`xfer f${n} b${n}`);
				// if (frill || sequence[(((n / colCt) % sequence.length) / colCt)] === 'b') generated.push(`xfer f${n} b${n}`); //new //TODO: //check
			}
		} else { //this again if width of rib increases (transfer new stitches)
			// if (min < pattern.xfers[0]) {
			for (let n = min; n <= max; ++n) {
				if (!prevNs.includes(n)) {
					if (sequence[n % sequence.length] === 'f') generated.push(`xfer b${n} f${n}`);
					if (sequence[n % sequence.length] === 'b') generated.push(`xfer f${n} b${n}`);
				}

				if (sequence !== 'fb' && !nextNs.includes(n)) { //new //*
					if (sequence[n % sequence.length] === 'b' && n % 2 === 0) xferBack.push(`xfer b${n} f${n}`);
					if (sequence[n % sequence.length] === 'f' && n % 2 !== 0) xferBack.push(`xfer f${n} b${n}`);
				}

				// if (sequence !== 'fb' && !nextNs.includes(n) && n % 2 === 0) { //new //*
				// 	if (sequence[n % sequence.length] === 'b') xferBack.push(`xfer b${n} f${n}`);
				// 	if (sequence[n % sequence.length] === 'f') xferBack.push(`xfer f${n} b${n}`);
				// }
			}
			// if (min < prevRowLeftN) {
			// 	generated.push('x-speed-number 300', 'x-roller-advance 0');
			// 	// for (let n = pattern.xfers[0] - 1; n >= min; --n) {
			// 	for (let n = prevRowLeftN - 1; n >= min; --n) {
			// 		if (sequence[n % sequence.length] === 'f') generated.push(`xfer b${n} f${n}`);
			// 	}
			// 	// for (let n = min; n < pattern.xfers[0]; ++n) {
			// 	for (let n = min; n < prevRowLeftN; ++n) {
			// 		if (sequence[n % sequence.length] === 'b') generated.push(`xfer f${n} b${n}`);
			// 		// if (frill || sequence[(((n / colCt) % sequence.length) / colCt)] === 'b') generated.push(`xfer f${n} b${n}`); //new //TODO: //check
			// 	}
			// }
			// // if (max > pattern.xfers[1]) {
			// if (max > prevRowRightN) {
			// 	generated.push('x-speed-number 300', 'x-roller-advance 0');
			// 	// for (let n = max; n > pattern.xfers[1]; --n) {
			// 	for (let n = max; n > prevRowRightN; --n) {
			// 		if (sequence[n % sequence.length] === 'f') generated.push(`xfer b${n} f${n}`);
			// 	}
			// 	// for (let n = pattern.xfers[1] + 1; n <= max; ++n) {
			// 	for (let n = prevRowRightN + 1; n <= max; ++n) {
			// 		if (sequence[n % sequence.length] === 'b') generated.push(`xfer f${n} b${n}`);
			// 		// if (frill || sequence[(((n / colCt) % sequence.length) / colCt)] === 'b') generated.push(`xfer f${n} b${n}`); //new //TODO: //check
			// 	}
			// }
		}

		// calculate rib stitch number based on actual stitch number
		generated.push(`x-speed-number ${speed_number}`, `x-roller-advance ${roller_advance}`, `x-stitch-number ${Math.ceil(Number(stitch_number) / 2)}`);
	
		dir === '-' ? NEGRIB(min, max) : POSRIB(min, max);

		generated.push(`x-stitch-number ${stitch_number}`);

		if (xferBack.length) {
			generated.push('x-speed-number 300', 'x-roller-advance 0', ";transfer alternating needles that aren't in next pattern row");
			generated = [...generated, ...xferBack];
			generated.push(`x-speed-number ${speed_number}`, `x-roller-advance ${roller_advance}`); //reset
		}


		// if (!double_bed) { //TODO: maybe add this back in
		// 	generated.push('x-speed-number 100');
		// 	for (let n = colors_arr[0].length; n >= 1; --n) {
		// 		generated.push(`xfer b${n} f${n}`);
		// 	}
		// 	generated.push(`x-speed-number ${speed_number}`, `;end rib`);
		// }

		return generated;
	}
}


//----------------
//--- GARTER ---//
//----------------
function generateGarter(min, max, dir, carrier, currNs, prevNs, nextNs) { //TODO: xfer back to front bed *always* after knitting so floats are behind //TODO: tuck instead of knitting if avoidOnBack = [[], []]
	let patternRows = (options ? options.patternRows : 2); //*

	const POS_GARTER = (bed) => {
		for (let n = min; n <= max; ++n) {
			generated.push(`knit + ${bed}${n} ${carrier}`)
		}
	};

	const NEG_GARTER = (bed) => {
		for (let n = max; n >= min; --n) {
			generated.push(`knit - ${bed}${n} ${carrier}`);
		}
	};

	generated.push(';stitch pattern: Garter');
	// generated.push(`;stitch pattern: Garter (row: ${row_count})`);
	let emptyNeedles = ';empty:'; //new //*

	let mod = row_count % (patternRows*2);
	let garterBed, otherBed, xfer_mod;

	if (mod < patternRows) { // (maybe) xfer to front bed and knit there
		garterBed = 'f';
		otherBed = 'b';
		xfer_mod = 0;
	} else { // (maybe) xfer to back bed and knit there
		garterBed = 'b';
		otherBed = 'f';
		xfer_mod = patternRows;
	}

	avoidOnBack = [[], []];
	for (let n = min; n <= max; ++n) {
		// if (!generateKnitout && garterBed !== 'b' && currNs.includes(n)) avoidOnBack.push(n); //don't knit these //TODO: have it instead do every other (like a cast-on)
		// if (!generateKnitout && garterBed !== 'b' && currNs.includes(n)) {
		// 	if (n % 2 === 0) avoidOnBack[0].push(n);
		// 	else avoidOnBack[1].push(n);
		// 	// avoidOnBack.push(n); //don't knit these //TODO: have it instead do every other (like a cast-on)
		// }
		if (!generateKnitout && currNs.includes(n)) {
			if (n % 2 === 0) avoidOnBack[0].push(n);
			else avoidOnBack[1].push(n);
			// avoidOnBack.push(n); //don't knit these //TODO: have it instead do every other (like a cast-on)
		}
		emptyNeedles += ` ${otherBed}${n}`; //TODO: only do this if front empty (since back might not be empty...) but only if other carriers are being used... hm....
	}

	if (!generateKnitout) return avoidOnBack;

	generated.push(emptyNeedles); //new //*

	let xferBack = [];
	generated.push('x-speed-number 300', 'x-roller-advance 0');

	for (let n = min; n <= max; ++n) {
		// emptyNeedles += `${otherBed}${n}`;
		if (!prevNs.includes(n) || garterBed === 'b') generated.push(`xfer ${otherBed}${n} ${garterBed}${n}`); //if `!prevNs.includes(n)`, means width of garter increased (transfer new stitches) //only for front or new needles (since garter is always xfered back to front bed as home base)
		// if (!prevNs.includes(n) || garterBed === 'b' || row_count % (patternRows*2) === 0) generated.push(`xfer ${otherBed}${n} ${garterBed}${n}`); //if `!prevNs.includes(n)`, means width of garter increased (transfer new stitches)
		// if (mod === xfer_mod || !prevNs.includes(n)) generated.push(`xfer ${otherBed}${n} ${garterBed}${n}`); //if `!prevNs.includes(n)`, means width of garter increased (transfer new stitches)

		if (!nextNs.includes(n) && n % 2 === 0) xferBack.push(`xfer ${garterBed}${n} ${otherBed}${n}`) //every other //new //*
	}

	// generated.push(`x-speed-number ${speed_number}`, `x-roller-advance ${roller_advance}`); //reset //TODO: if back bed, maybe more roller since xferring back //? //lets try that
	generated.push(`x-speed-number ${speed_number}`);
	if (garterBed === 'b') generated.push(`x-roller-advance ${roller_advance+100}`); //reset //TODO: if back bed, maybe more roller since xferring back //? //lets try that
	else generated.push(`x-roller-advance ${roller_advance}`); //reset //TODO: if back bed, maybe more roller since xferring back //? //lets try that


	dir === '+' ? POS_GARTER(garterBed) : NEG_GARTER(garterBed);

	generated.push('x-speed-number 300', 'x-roller-advance 0'); //for (potential) xfers

	//*
	if (xferBack.length) {
		generated.push(";transfer alternating needles that aren't in next pattern row");
		generated = [...generated, ...xferBack];
		// generated.push(`x-speed-number ${speed_number}`, `x-roller-advance ${roller_advance}`); //reset
	}

	if (garterBed === 'b') {
		generated.push(";transfer needles to front");
		for (let n = min; n <= max; ++n) {
			// emptyNeedles += `${otherBed}${n}`;
			if (nextNs.includes(n)) generated.push(`xfer b${n} f${n}`); //xfer to front bed so don't see floats
		}
		// generated.push(`x-speed-number ${speed_number}`, `x-roller-advance ${roller_advance}`); //reset
	}

	generated.push(`x-speed-number ${speed_number}`, `x-roller-advance ${roller_advance}`); //reset

	return generated;
}


//--------------
//--- SEED ---//
//--------------
// function generateSeed(min, max, dir, carrier, avoid) { //TODO: figure out how to avoid the back passes / make back passes only on correct needles / a pretty pattern
function generateSeed(min, max, dir, carrier) { //TODO: figure out how to avoid the back passes / make back passes only on correct needles / a pretty pattern
	function posSeed() {
		if (row_count % 2 === 0) {
			for (let n = min; n <= max; ++n) {
				if (n % 2 === 0) {
					if (generateKnitout) generated.push(`knit + f${n} ${carrier}`);
					else avoidOnBack.push(n); //TODO: have way to change this if other carrier knits before (so avoidOnBack will be different for that carrier compared to carriers knitting after seed carrier)
				} else if (generateKnitout) generated.push(`knit + b${n} ${carrier}`);
			}
		} else {
			for (let n = min; n <= max; ++n) {
				if (n % 2 === 0) {
					if (generateKnitout) generated.push(`knit + b${n} ${carrier}`);
				} else {
					if (generateKnitout) generated.push(`knit + f${n} ${carrier}`);
					else avoidOnBack.push(n);
				}
			}
		}
	}

	function negSeed() {
		if (row_count % 2 === 0) {
			for (let n = max; n >= min; --n) {
				if (n % 2 === 0) {
					if (generateKnitout) generated.push(`knit - f${n} ${carrier}`);
					else avoidOnBack.push(n);
				} else if (generateKnitout) generated.push(`knit - b${n} ${carrier}`);
			}
		} else {
			for (let n = max; n >= min; --n) {
				if (n % 2 === 0) {
					if (generateKnitout) generated.push(`knit - b${n} ${carrier}`);
				} else {
					if (generateKnitout) generated.push(`knit - f${n} ${carrier}`);
					else avoidOnBack.push(n);
				}
				// if (generateKnitout && n % 2 === 0) generated.push(`knit - b${n} ${carrier}`);
				// else {
				// 	if (generateKnitout) generated.push(`knit - f${n} ${carrier}`);
				// 	else avoidOnBack.push(n);
				// }
			}
		}
	}

	if (!generateKnitout) { //new
		posSeed(); //direction doesn't matter
		return avoidOnBack;
	} else { //new
		generated.push(';stitch pattern: Seed');
		let emptyNeedles = ';empty:';

		// generated.push('x-roller-advance 0', 'x-speed-number 100');
		generated.push(`x-stitch-number ${Math.floor(stitch_number/2)}`, 'x-speed-number 300', 'x-roller-advance 80', 'x-xfer-style two-pass'); //?
		if (row_count % 2 === 0) {
			for (let n = min; n <= max; ++n) {
				if (n % 2 === 0) {
					generated.push(`xfer b${n} f${n}`);
					emptyNeedles += ` b${n}`; //new //check
				} else {
					generated.push(`xfer f${n} b${n}`);
					emptyNeedles += ` f${n}`; //new //check
				}
			}
		} else {
			for (let n = min; n <= max; ++n) {
				if (n % 2 === 0) {
					generated.push(`xfer f${n} b${n}`);
					emptyNeedles += ` f${n}`; //new //check
				} else {
					generated.push(`xfer b${n} f${n}`);
					emptyNeedles += ` b${n}`; //new //check
				}
			}
		}
		generated.push(emptyNeedles);

		generated.push('x-xfer-style four-pass', `x-stitch-number ${stitch_number}`, `x-speed-number ${speed_number}`, 'x-roller-advance 300'); //TODO: make this only if that row contains solely seed stitch
	
		dir === '-' ? negSeed() : posSeed();

		generated.push(`x-roller-advance ${roller_advance}`);

		return generated;
	}
}

//-----------------
//--- BUBBLES ---//
//-----------------
function generateBubbles(min, max, dir, carrier) { //TODO: test in bubbles need to be transferred to front to be completed successfully
	let bubbleStitch = stitch_number;
	let betweenStitch = Math.floor(bubbleStitch/2);
	let bubbleRoller = 200; //TODO: find ideal roller advance (maybe 300?)

	//TODO: make these customizable
	let bubbleWidth = (options ? options.bubbleWidth : 5);
	let bubbleHeight = (options ? options.bubbleHeight : 8);
	let overlap = (options ? options.overlap : 1);
	// let bubbleWidth = 5; 
	// let bubbleHeight = 8;
	// let overlap = 1;
	let altTuck = true;

	if (bubbleWidth === 5) bubbleRoller = 300; //remove //debug

	// let leftover = false;
	let spaceBetween = bubbleWidth - (2 * overlap);

	let bubbleCount = 0;

	function createBubble(leftN, rightN) {
		generated.push(`x-stitch-number ${bubbleStitch}`);
		if (bubbleCount % 2 === 0) extraCarrierPass();
		generated.push(`x-roller-advance ${bubbleRoller}`); //?
		if (dir === '+') {
			if (rightN > max) {
				if (max - leftN + 1 === overlap) leftover = false;
				else leftover = rightN - max;
				rightN = max;
			} else leftover = overlap;
			for (let r = 0; r < bubbleHeight/2; ++r) {
				for (let n = leftN; n <= rightN; ++n) {
					generated.push(`knit + f${n} ${carrier}`);
				}
				if (rightN !== pieceWidth && (!altTuck || r % 2 === 0)) {
					generated.push(`x-stitch-number ${betweenStitch}`, 'x-roller-advance 0', `tuck + f${rightN+1} ${carrier}`, `x-stitch-number ${bubbleStitch}`, `x-roller-advance ${bubbleRoller}`);
				}
				for (let n = rightN; n >= leftN; --n) {
					generated.push(`knit - f${n} ${carrier}`);
				}
				if (leftN !== 1 && (!altTuck || r % 2 !== 0)) {
					generated.push(`x-stitch-number ${betweenStitch}`, 'x-roller-advance 0', `tuck - f${leftN-1} ${carrier}`, `x-stitch-number ${bubbleStitch}`, `x-roller-advance ${bubbleRoller}`);
				}
			}
			//once more
			for (n = leftN; n <= rightN; ++n) {
				generated.push(`knit + f${n} ${carrier}`);
			}
		} else {
			if (leftN < min) {
				if (rightN - min - 1 === overlap) leftover === false;
				else leftover = min - leftN;
				leftN = min;
			} else leftover = overlap;
			for (let r = 0; r < bubbleHeight/2; ++r) {
				for (let n = rightN; n >= leftN; --n) {
					generated.push(`knit - f${n} ${carrier}`);
				}
				if (leftN !== 1 && (!altTuck || r % 2 === 0)) {
					generated.push(`x-stitch-number ${betweenStitch}`, 'x-roller-advance 0', `tuck - f${leftN-1} ${carrier}`, `x-stitch-number ${bubbleStitch}`, `x-roller-advance ${bubbleRoller}`);
				}
				for (n = leftN; n <= rightN; ++n) {
					generated.push(`knit + f${n} ${carrier}`);
				}
				if (rightN !== pieceWidth && (!altTuck || r % 2 !== 0)) {
					generated.push(`x-stitch-number ${betweenStitch}`, 'x-roller-advance 0', `tuck + f${rightN+1} ${carrier}`, `x-stitch-number ${bubbleStitch}`, `x-roller-advance ${bubbleRoller}`);
				}
			}
			//once more
			for (let n = rightN; n >= leftN; --n) {
				generated.push(`knit - f${n} ${carrier}`);
			}
		}
		++bubbleCount;
	}

	function posBubblePass() {
		let n = min;
		let shift = spaceBetween;
		if (leftover) {
			let w = leftover + 1;
			createBubble(n, n + leftover);
			shift = 0;
			n += w;
		}
		for (n; n <= max; ++n) {
			if (shift === spaceBetween) {
				createBubble(n, n + (bubbleWidth-1));
				shift = 0;
				n += (bubbleWidth-1);
			} else {
				generated.push(`x-stitch-number ${betweenStitch}`, `knit + f${n} ${carrier}`);
				++shift;
				if (n === max) {
					leftover = shift + overlap;
				}
			}
		}
	}

	function negBubblePass() {
		let n = max;
		let shift = spaceBetween;
		if (leftover) {
			let w = leftover;
			createBubble((n - leftover) + 1, n);
			shift = 0;
			n -= w;
		}
		for (n; n >= min; --n) {
			if (shift === spaceBetween) {
				createBubble(n - (bubbleWidth-1), n);
				n -= (bubbleWidth-1);
				shift = 0;
			} else {
				generated.push(`x-stitch-number ${betweenStitch}`, `knit - f${n} ${carrier}`);
				if (n === min) leftover = shift + overlap;
				++shift;
			}
		}
	}

	generated.push(';stitch pattern: Bubbles'); //?

	dir === '+' ? posBubblePass() : negBubblePass();

	if (extraCarrier && extraCarrierPasses % 2 !== 0) extraCarrierPass(); //make sure carrier ends up where it started

	generated.push(`x-roller-advance ${roller_advance}`);

	return generated;
}

//--------------
//--- LACE ---//
//--------------
function generateLace(min, max, dir, carrier) { //TODO: figure out what to do about avoiding all... maybe have it tuck over any empty needles?
	let laceRows = (options ? options.laceRows : 2);
	let spaceBtwHoles = (options ? options.spaceBtwHoles : 1);
	let offset = (options ? options.offset : 1);
	let offsetReset = (options ? options.offsetReset : 0);

	let xferPasses = row_count - ((laceRows-1)*(row_count/laceRows));

	let mod = offset*row_count;
	if (mod > spaceBtwHoles || (offsetReset !== 0 && (xferPasses+1) % offsetReset == 0)) mod = 0;

	const POSLACE = () => {
		for (let n = min; n <= max; ++n) {
			if (generateKnitout) generated.push(`knit + f${n} ${carrier}`);
			else avoidOnBack.push(n);
		}
	};

	const NEGLACE = () => {
		for (let n = max; n >= min; --n) {
			if (generateKnitout) generated.push(`knit - f${n} ${carrier}`);
			else avoidOnBack.push(n);
		}
	};

	if (generateKnitout) { //new
		generated.push(';stitch pattern: Lace');

		if (row_count % laceRows == 0) {
			generated.push('x-roller-advance 0');
			generated.push(`x-xfer-stitch-number ${stitch_number}`); //new //check
			let rack = (xferPasses % 2 == 0 ? 1 : -1);

			for (let n = min; n <= max; ++n) {
				if ((n - min) % (spaceBtwHoles+1) === mod && n !== min && n !== max) generated.push(`xfer f${n} b${n}`);
			}

			generated.push(`rack ${rack}`);

			for (let n = min; n <= max; ++n) {
				if ((n - min) % (spaceBtwHoles+1) === mod && n !== min && n !== max) generated.push(`xfer b${n} f${n+rack}`);
			}

			generated.push('rack 0');

			generated.push(`x-xfer-stitch-number ${Math.ceil(stitch_number/2)}`); //new //check
		}

		let laceStitch = stitch_number+3;
		if (laceStitch > 9) laceStitch = 9;
		generated.push(`x-stitch-number ${laceStitch}`);
		generated.push('x-roller-advance 300');
	}

	dir === '+' ? POSLACE() : NEGLACE();

	if (generateKnitout) {
		generated.push(`x-stitch-number ${stitch_number}`);
		generated.push(`x-roller-advance ${roller_advance}`);

		return generated;
	} else return avoidOnBack;
}

//---------------------
//--- BUTTON HOLES ---//
//---------------------
function generateHorizButtonhole(buttonLeft, buttonRight, dir, carrier, action) {
	generated.push(';stitch pattern: Horizontal Buttonhole');

	if (action === 'bindoff') { //buttonhole time (bindoff)
		generated.push('x-roller-advance 100');
		generated.push(`x-xfer-stitch-number ${Math.ceil(stitch_number/2)}`);

		for (let n = buttonLeft; n <= buttonRight; ++n) { //bindoff
			generated.push(`xfer f${n} b${n}`);
		}

		if (dir === '+') {
			for (let n = buttonLeft; n <= buttonRight; ++n) { //bindoff
				generated.push(`knit + b${n} ${carrier}`);
				if (n === buttonLeft) generated.push(`knit - b${n+1} ${carrier}`); //twisted stitch, just to get bindoff going //new //TODO: //check on machine (this works well here, but not for actually bindoff for some reason)
				else generated.push(`tuck - b${n-1} ${carrier}`);

				generated.push(`xfer b${n} f${n}`);
				generated.push('rack -1');
				generated.push(`xfer f${n} b${n+1}`);
				generated.push('rack 0');

				if (n > buttonLeft) generated.push('x-add-roller-advance -100', `drop b${n-1}`);
			}
		} else {
			for (let n = buttonRight; n >= buttonLeft; --n) { //bindoff
				generated.push(`knit - b${n} ${carrier}`);
				if (n === buttonRight) generated.push(`knit + b${n-1} ${carrier}`); //twisted stitch, just to get bindoff going //new //TODO: //check on machine
				else generated.push(`tuck - b${n+1} ${carrier}`);

				generated.push(`xfer b${n} f${n}`);
				generated.push('rack 1');
				generated.push(`xfer f${n} b${n-1}`);
				generated.push('rack 0');

				if (n < buttonRight) generated.push('x-add-roller-advance -100', `drop b${n+1}`);
			}
		}
		generated.push(`x-roller-advance ${roller_advance}`);
	} else { //cast back on
		generated.push('rack 0.25');
		if (dir === '+') {
			for (let n = buttonLeft; n <= buttonRight; ++n) {
				generated.push(`knit + f${n} ${carrier}`, `knit + b${n} ${carrier}`);
			}
		} else {
			for (let n = buttonRight; n >= buttonLeft; --n) {
				generated.push(`knit - b${n} ${carrier}`, `knit - f${n} ${carrier}`);
			}
		}
		generated.push('rack 0');
	}

	return generated;
}

function generateRibButtonhole(sequence, buttonLeft, buttonRight, dir, carrier, action) {
	generated.push(';stitch pattern: Rib Buttonhole');
	
	if (action === 'bindoff') { //buttonhole time (bindoff)
		generated.push(';shapeify_ignore start'); //new //*
		generated.push('x-roller-advance 100');
		generated.push(`x-xfer-stitch-number ${Math.ceil(stitch_number/2)}`);
		
		for (let n = buttonLeft; n <= buttonRight; ++n) { //bindoff
			if (sequence[n % sequence.length] === 'f') generated.push(`xfer f${n} b${n}`); //new //*
		}
		
		if (dir === '+') {
			for (let n = buttonLeft; n <= buttonRight; ++n) { //bindoff
				generated.push(`knit + b${n} ${carrier}`);

				if (n === buttonLeft) generated.push(`miss - b${n-1} ${carrier}`); //new
				else generated.push(`tuck - b${n-1} ${carrier}`); //new
				// if (n === buttonLeft) generated.push(`knit - b${n+1} ${carrier}`); //twisted stitch, just to get bindoff going //TODO: //check on machine (this works well here, but not for actually bindoff for some reason)
				// else generated.push(`tuck - b${n-1} ${carrier}`); //removed //^ //TODO: check to see if works better now
				
				generated.push(`xfer b${n} f${n}`);
				generated.push('rack -1');
				generated.push(`xfer f${n} b${n+1}`);
				generated.push('rack 0');
				
				if (n > buttonLeft) generated.push('x-add-roller-advance -100', `drop b${n-1}`);
			}
			
			if (sequence[(buttonRight + 1) % sequence.length] === 'f') generated.push(`xfer b${buttonRight+1} f${buttonRight+1}`); //new //check
		} else {
			for (let n = buttonRight; n >= buttonLeft; --n) { //bindoff
				generated.push(`knit - b${n} ${carrier}`);
				if (n === buttonRight) generated.push(`miss - b${n+1} ${carrier}`); //new
				else generated.push(`tuck - b${n+1} ${carrier}`); //new
				// if (n === buttonRight) generated.push(`knit + b${n-1} ${carrier}`); //twisted stitch, just to get bindoff going /TODO: //check on machine
				// else generated.push(`tuck - b${n+1} ${carrier}`); //removed //^ //TODO: check to see if works better now
				
				generated.push(`xfer b${n} f${n}`);
				generated.push('rack 1');
				generated.push(`xfer f${n} b${n-1}`);
				generated.push('rack 0');
				
				if (n < buttonRight) generated.push('x-add-roller-advance -100', `drop b${n+1}`);
			}

			if (sequence[(buttonLeft - 1) % sequence.length] === 'f') generated.push(`xfer b${buttonLeft - 1} f${buttonLeft - 1}`); //new //check
		}
		generated.push(`x-roller-advance ${roller_advance}`);
		generated.push(';shapeify_ignore end'); //new //*
	} else { //cast back on
		generated.push('rack 0.25'); //TODO: check if zigzag for rib works ok (or if should do full need and then xfer)
		if (dir === '+') {
			for (let n = buttonLeft; n <= buttonRight; ++n) {
				if (sequence[n % sequence.length] === 'f') generated.push(`knit + f${n} ${carrier}`); //new
				else generated.push(`knit + b${n} ${carrier}`);
			}
		} else {
			for (let n = buttonRight; n >= buttonLeft; --n) {
				if (sequence[n % sequence.length] === 'b') generated.push(`knit - b${n} ${carrier}`);
				else generated.push(`knit - f${n} ${carrier}`);
			}
		}
		generated.push('rack 0');
	}
	
	return generated;
}


//-------------------------------
//--- MAIN PATTERN FUNCTION ---//
//-------------------------------
function generatePattern(pattern, row, min, max, needles, generate, dir, speed, stitch, roller, width, currentCarrier, backpassCarrier, rowColCt, prevRowNs, nextRowNs) { // rowColCt = new
	generated = [];
	avoidOnBack = [];

	// if (row == console.log('')
	let patternName = pattern.name;
	row_count = row;
	options = pattern.options;
	generateKnitout = generate; //new
	if (generate) {
		speed_number = speed;
		stitch_number = stitch;
		roller_advance = roller;
		pieceWidth = width;
		extraCarrier = backpassCarrier;
		colCt = rowColCt;
	}
	// row_count = row;
	// speed_number = speed;
	// stitch_number = stitch;
	// roller_advance = roller;
	// pieceWidth = width;
	// extraCarrier = backpassCarrier;
	// options = pattern.options;
	// console.log(pattern.name); //remove //debug
	// console.log(options); //remove //debug
	// console.log(Object.keys(options).length); //remove //debug
	if (!prevRowNs) prevRowNs = [max+1, min-1]; //new //*

	if (!nextRowNs) nextRowNs = []; //new //*
	
	if (!generate && avoidAll.includes(patternName)) { //Lace
		let pMin = min,
			pMax = max;

		for (let n = pMin; n <= pMax; ++n) {
			avoidOnBack.push(n); //new
		}
		return avoidOnBack;
	} else {
		if (patternName.includes('Rib')) {
			// let sequence = (patternName.includes('1x1') ? 'fb' : 'ffbb');
			// let rib_type = patternName.split(' ')[1].split('x');
			// let sequence = `${'f'.repeat(Number(rib_type[0]))}${'b'.repeat(Number(rib_type[0]))}`;

			// let sequence;
			// if (patternName === 'Rib 1x1') sequence = 'fb';
			// else if (patternName === 'Rib 2x2') sequence = 'ffbb';
			// let pattern = "bbffbf";
			// return generateRib(sequence, min, max, dir, pattern.carrier, pattern);
			if (patternName.includes('Buttonholes')) return generateRibButtonhole((patternName.includes('1x1') ? 'fb' : 'ffbb'), min, max, dir, currentCarrier, pattern.action);
			// else return generateRib(sequence, min, max, dir, pattern.carrier, needles, prevRowNs, nextRowNs, true); //new /Frill for now, just to test
			else return generateRib(min, max, dir, pattern.carrier, needles, prevRowNs, nextRowNs, true); //new /Frill for now, just to test
		} else if (patternName === 'Garter') return generateGarter(min, max, dir, pattern.carrier, needles, prevRowNs, nextRowNs);
		else if (patternName === 'Seed') return generateSeed(min, max, dir, pattern.carrier);
		else if (patternName === 'Bubbles') {
			if (generate) return generateBubbles(min, max, dir, pattern.carrier);
			else return [];
		} else if (patternName === 'Lace') return generateLace(min, max, dir, pattern.carrier);
		else if (patternName === 'Horizontal Buttonholes') return generateHorizButtonhole(min, max, dir, currentCarrier, pattern.action);
	}
}

module.exports = { frontOnlyPatterns, generatePattern };