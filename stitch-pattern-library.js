// called with: `patternLibrary.generatePattern`

//---------------------------
//--- INITIAL VARIABLES ---//
//---------------------------
let frontOnlyPatterns = ['Bubbles', 'Lace'];
let avoidAll = ['Lace', 'Buttonholes']; //new

let generateKnitout;
let generated = [];
let avoid = []; //new

let speed_number, stitch_number, roller_advance, row_count, pieceWidth, extraCarrier;

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
// function generateRib(sequence, min, max, dir, carrier, avoid, pattern) {
function generateRib(sequence, min, max, dir, carrier, pattern) {
	const POSRIB = () => {
		for (let n = min; n <= max; ++n) {
			if (sequence[n % sequence.length] === 'f') {
				if (generateKnitout) generated.push(`knit + f${n} ${carrier}`);
				else avoid.push(n);
				// generated.push(`knit + f${n} ${carrier}`);
				// avoid.push(n);
			// } else generated.push(`knit + b${n} ${carrier}`);
			} else if (generateKnitout) generated.push(`knit + b${n} ${carrier}`);
		}
	};

	const NEGRIB = () => {
		for (let n = max; n >= min; --n) {
			if (sequence[n % sequence.length] === 'f') {
				if (generateKnitout) generated.push(`knit - f${n} ${carrier}`);
				else avoid.push(n);
				// generated.push(`knit - f${n} ${carrier}`);
				// avoid.push(n);
			// } else generated.push(`knit - b${n} ${carrier}`);
			} else if (generateKnitout) generated.push(`knit - b${n} ${carrier}`);
		}
	};

	if (!generateKnitout) { //new
		POSRIB(); //direction doesn't matter
		return avoid;
	} else {
		generated.push(';stitch pattern: Rib'); //?

		if (row_count === 0) { //TODO: this again if width of rib increases (transfer new stitches)
			// pattern.xfers[0] = min;
			// pattern.xfers[1] = max;
			generated.push('x-speed-number 300', 'x-roller-advance 0');
			for (let n = max; n >= min; --n) { ////doesn't rly matter direction for xfer
				if (sequence[n % sequence.length] === 'f') generated.push(`xfer b${n} f${n}`);
			// if (n % 2 === 0) generated.push(`xfer b${n} f${n}`);
			}
			for (let n = min; n <= max; ++n) {
				if (sequence[n % sequence.length] === 'b') generated.push(`xfer f${n} b${n}`);
			// if (n % 2 !== 0) generated.push(`xfer f${n} b${n}`);
			}
		} else {
			if (min < pattern.xfers[0]) {
				generated.push('x-speed-number 300', 'x-roller-advance 0');
				for (let n = pattern.xfers[0] - 1; n >= min; --n) {
					if (sequence[n % sequence.length] === 'f') generated.push(`xfer b${n} f${n}`);
				}
				for (let n = min; n < pattern.xfers[0]; ++n) {
					if (sequence[n % sequence.length] === 'b') generated.push(`xfer f${n} b${n}`);
				}
				// pattern.xfers[0] = min;
			}
			if (max > pattern.xfers[1]) {
				generated.push('x-speed-number 300', 'x-roller-advance 0');
				for (let n = max; n > pattern.xfers[1]; --n) {
					if (sequence[n % sequence.length] === 'f') generated.push(`xfer b${n} f${n}`);
				}
				for (let n = pattern.xfers[1] + 1; n <= max; ++n) {
					if (sequence[n % sequence.length] === 'b') generated.push(`xfer f${n} b${n}`);
				}
				// pattern.xfers[1] = max;
			}
		}

		// calculate rib stitch number based on actual stitch number
		generated.push(`x-speed-number ${speed_number}`, `x-roller-advance ${roller_advance}`, `x-stitch-number ${Math.ceil(Number(stitch_number) / 2)}`);
	
		dir === '-' ? NEGRIB() : POSRIB();

		generated.push(`x-stitch-number ${stitch_number}`);

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

//--------------
//--- SEED ---//
//--------------
// function generateSeed(min, max, dir, carrier, avoid) { //TODO: figure out how to avoid the back passes / make back passes only on correct needles / a pretty pattern
function generateSeed(min, max, dir, carrier) { //TODO: figure out how to avoid the back passes / make back passes only on correct needles / a pretty pattern
	function posSeed() {
		if (row_count % 2 === 0) {
			for (let n = min; n <= max; ++n) {
				if (n % 2 === 0) {
				// 	generated.push(`knit + f${n} ${carrier}`);
				// 	avoid.push(n);
				// } else generated.push(`knit + b${n} ${carrier}`);
					if (generateKnitout) generated.push(`knit + f${n} ${carrier}`);
					else avoid.push(n);
				} else if (generateKnitout) generated.push(`knit + b${n} ${carrier}`);
			}
		} else {
			for (let n = min; n <= max; ++n) {
				// if (n % 2 === 0) generated.push(`knit + b${n} ${carrier}`);
				// else {
				// 	generated.push(`knit + f${n} ${carrier}`);
				// 	avoid.push(n);
				// }
				if (generateKnitout && n % 2 === 0) generated.push(`knit + b${n} ${carrier}`);
				else {
					if (generateKnitout) generated.push(`knit + f${n} ${carrier}`);
					else avoid.push(n);
				}
			}
		}
	}

	function negSeed() {
		if (row_count % 2 === 0) {
			for (let n = max; n >= min; --n) {
				if (n % 2 === 0) {
				// 	generated.push(`knit - f${n} ${carrier}`);
				// 	avoid.push(n);
				// } else generated.push(`knit - b${n} ${carrier}`);
					if (generateKnitout) generated.push(`knit - f${n} ${carrier}`);
					else avoid.push(n);
				} else if (generateKnitout) generated.push(`knit - b${n} ${carrier}`);
			}
		} else {
			for (let n = max; n >= min; --n) {
				// if (n % 2 === 0) generated.push(`knit - b${n} ${carrier}`);
				// else {
				// 	generated.push(`knit - f${n} ${carrier}`);
				// 	avoid.push(n);
				// }
				if (generateKnitout && n % 2 === 0) generated.push(`knit - b${n} ${carrier}`);
				else {
					if (generateKnitout) generated.push(`knit - f${n} ${carrier}`);
					else avoid.push(n);
				}
			}
		}
	}

	if (!generateKnitout) { //new
		posSeed(); //direction doesn't matter
		return avoid;
	} else { //new
		generated.push(';stitch pattern: Seed');
		let emptyNeedles = ';empty:';

		// generated.push('x-roller-advance 0', 'x-speed-number 100');
		generated.push(`x-stitch-number ${Math.floor(stitch_number/2)}`, 'x-speed-number 200', 'x-roller-advance 80', 'x-xfer-style two-pass'); //?
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

	
	// extraCarrierPass(); //? //remove

	dir === '+' ? posBubblePass() : negBubblePass();

	if (extraCarrier && extraCarrierPasses % 2 !== 0) extraCarrierPass(); //make sure carrier ends up where it started

	generated.push(`x-roller-advance ${roller_advance}`);

	return generated;
}

//--------------
//--- LACE ---//
//--------------
// function generateLace(min, max, dir, carrier, avoid) {
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
			// generated.push(`knit + f${n} ${carrier}`);
			// avoid.push(n);
			if (generateKnitout) generated.push(`knit + f${n} ${carrier}`);
			else avoid.push(n);
		}
	};

	const NEGLACE = () => {
		for (let n = max; n >= min; --n) {
			// generated.push(`knit - f${n} ${carrier}`);
			// avoid.push(n);
			if (generateKnitout) generated.push(`knit - f${n} ${carrier}`);
			else avoid.push(n);
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
				// if (n !== min && n !== max) generated.push(`xfer f${n} b${n}`); //don't xfer edge-most stitches so don't have to worry about them dropping
			}

			generated.push(`rack ${rack}`);

			for (let n = min; n <= max; ++n) {
				if ((n - min) % (spaceBtwHoles+1) === mod && n !== min && n !== max) generated.push(`xfer b${n} f${n+rack}`);
			}

			generated.push('rack 0');

			// for (let n = min; n <= max; ++n) {
			// 	if ((n - min) % (spaceBtwHoles+1) !== mod && n !== min && n !== max) generated.push(`xfer b${n} f${n}`);
			// 	// if ((n - min) % (spaceBtwHoles+1) !== mod || n === min || n === max) generated.push(`xfer b${n} f${n}`);
			// }
			// generated.push(`x-roller-advance ${roller_advance}`);
			// generated.push('x-roller-advance 300');
			generated.push(`x-xfer-stitch-number ${Math.ceil(stitch_number/2)}`); //new //check
		}

		// let laceStitch = Math.ceil(stitch_number*1.5);
		let laceStitch = stitch_number+3;
		if (laceStitch > 9) laceStitch = 9;
		generated.push(`x-stitch-number ${laceStitch}`);
		generated.push('x-roller-advance 300');
	}

	dir === '+' ? POSLACE() : NEGLACE();
	// generated.push(`x-stitch-number ${stitch_number}`);
	// generated.push(`x-roller-advance ${roller_advance}`);

	// return generated;
	if (generateKnitout) {
		generated.push(`x-stitch-number ${stitch_number}`);
		generated.push(`x-roller-advance ${roller_advance}`);

		return generated;
	} else return avoid;
}

//---------------------
//--- BUTTON HOLE ---//
//---------------------
// function generateButtonHole(min, max, dir, carrier, side, avoid) {
function generateButtonHole(min, max, dir, carrier, side) { //TODO: xfer all loops to front if first time
	if (row_count === 1) { //if first time
		for (let n = min; n <= max; ++n) {
			generated.push(`xfer b${n} f${n}`);
			// if (racked) generated.push(`knit + b${n} ${carrier}`);
		}
	}
	// avoid = []; //make it empty
	//TODO: attempt knitting at rack 0.25, and also just doing rib for this section instead of jacquard

	// let buttonHeight = (options ? (options.buttonHeight+1) : 7); //TODO: find the optimal button height
	let buttonHeight = (options ? options.buttonHeight : 6); //TODO: find the optimal button height
	let spaceBtwHoles = (options ? options.spaceBtwHoles : 5); //TODO: find the optimal space between holes //10 //?

	let mod = buttonHeight + spaceBtwHoles;

	// console.log('row_count:', row_count, 'dir:', dir, 'mod:', mod, 'row_count % mod:', row_count % mod, 'spaceBtwHoles:', spaceBtwHoles, 'buttonHeight', buttonHeight); //remove //debug

	const POSHOLE = () => {
		for (let n = min; n <= max; ++n) {
			generated.push(`knit + f${n} ${carrier}`); //f first since pos rack and pos direction
			// if (racked) generated.push(`knit + b${n} ${carrier}`);
		}
	};

	const NEGHOLE = () => {
		// if (first) generated.push('rack 0.25'); //check
		for (let n = max; n >= min; --n) {
			// if (racked) generated.push(`knit - b${n} ${carrier}`); //b first since pos rack and neg direction
			generated.push(`knit - f${n} ${carrier}`);
		}
		// if (last) generated.push('rack 0'); //check
	};

	if ((row_count % mod) < spaceBtwHoles) { //no hole, just one pass
		// generated.push('rack 0.25'); //check
		
		// if (dir === '+') {
		// 	if (!((row_count % mod) === 0 && side === 'left')) POSHOLE(); //skip if would cause a float //check
		// } else {
		// 	if (!((row_count % mod) === 0 && side === 'right')) NEGHOLE(); //skip if would cause a float //check if only for when inbtw % 2 === 0
		// }
		if (dir === '+') { //TODO: figure out why skipping for pos pass at top
			if ((spaceBtwHoles % 2 === 0) && (row_count % mod) === 0 && side === 'left') generated.push(';skipping to prevent float');
			else POSHOLE();
		} else {
			if ((spaceBtwHoles % 2 === 0) && (row_count % mod) === 0 && side === 'right') generated.push(';skipping to prevent float');
			else NEGHOLE(); //check
		}

		// works when sequence is: neg(1) pos(2[but]); neg(2[but]) pos(1) -- repeat
		//NOT when sequence is: neg(2[but]) pos(2) -- repeat (aka 2 is the only color) 

		// generated.push('rack 0');
	} else { //hole! (or skip)
		// for (let n = min; n <= max; ++n) {
		// 	avoid.push(n); //new
		// }
		// if (dir === '+' && ((side === 'left' && (row_count % mod) === spaceBtwHoles) || (side === 'right' && (row_count % mod) === (mod-1)))) { //yes
		// 	// if (row_count === (mod-1)) row_count -= 1; //undo future increment //? //go back!
		// 	generated.push(';stitch pattern: Buttonhole'); //?

		// 	generated.push('rack 0.25'); //check

		// 	for (let p = 0; p < buttonHeight; ++p) {
		// 		// if (p % 2 === 0) POSHOLE((p === 0), (p === buttonHeight-1)); //remove
		// 		if (p % 2 === 0) POSHOLE(true);
		// 		else NEGHOLE(true);
		// 	}

		// 	generated.push('rack 0');
		// } else
		if ((row_count % mod) === spaceBtwHoles) {
			// buttonHeight % 2 !== 0 && // dir === '+' && side === 'right' // dir === '-' && side === 'left'
			// ||
			// buttonHeight % 2 === 0 && // dir === '-' && side === 'right' // dir === '+' && side === 'left' // add extra pass!

			if ((buttonHeight % 2 === 0 && ((dir === '+' && side === 'left') || (dir === '-' && side === 'right'))) || (buttonHeight % 2 !== 0 && ((dir === '+' && side === 'right') || (dir === '-' && side === 'left')))) buttonHeight += 1; // to make sure carrier is correctly positioned //check //go back!

			let posMod = (dir === '+' ? 0 : 1);

			// generated.push(';stitch pattern: Buttonhole'); //?
			generated.push(`;stitch pattern: Buttonhole (${buttonHeight})`); //?

			if (side === 'right') generated.push(`xfer b${min} f${min}`, `xfer b${min+1} f${min+1}`, `xfer b${min+2} f${min+2}`);
			else generated.push(`xfer b${max} f${max}`, `xfer b${max-1} f${max-1}`, `xfer b${max-2} f${max-2}`); //new //cehck

			generated.push(`x-roller-advance ${200}`);

			// generated.push('rack 0.25'); //check

			for (let p = 0; p < buttonHeight; ++p) {
				if (p % 2 === posMod) POSHOLE(true);
				else NEGHOLE(true);
			}

			generated.push(`x-roller-advance ${roller_advance}`); //new

			// generated.push('rack 0');

			// } else if (dir === '-' && ((side === 'left' && (row_count % mod) === (mod-1)) || (side === 'right' && (row_count % mod) === spaceBtwHoles))) { //yes
			// 	generated.push(';stitch pattern: Buttonhole'); //?

			// 	generated.push('rack 0.25'); //check

			// 	for (let p = 0; p < buttonHeight; ++p) {
			// 		if (p % 2 === 0) NEGHOLE(true);
			// 		else POSHOLE(true);
			// 	}

			// 	generated.push('rack 0');
		} else { //otherwise, skip
			let backN1 = (side === 'right' ? (min) : (max));
			let backNShift = (side === 'right' ? (1) : (-1));
			generated.push(';stitch pattern: Buttonhole (other side)'); //? //new
			if ((row_count % mod) === (spaceBtwHoles+1)) {//first one
				if (dir === '+') generated.push(`knit + b${backN1} ${carrier}`, `knit + b${backN1+(backNShift*2)} ${carrier}`); //new
				else generated.push(`knit - b${backN1+(backNShift*2)} ${carrier}`, `knit - b${backN1} ${carrier}`); //new
				// if (dir === '+') generated.push(`knit + b${backN1} ${carrier}`, `knit + b${backN1+(backNShift*2)} ${carrier}`, `knit - b${backN1+backNShift} ${carrier}`); //new
				// else generated.push(`knit - b${backN1} ${carrier}`, `knit - b${backN1+(backNShift*2)} ${carrier}`, `knit + b${backN1+backNShift} ${carrier}`); //new
			} else if ((row_count % mod) === (spaceBtwHoles+2)) { //second one
				if (dir === '-') generated.push(`knit - b${backN1+backNShift} ${carrier}`); //new
				else generated.push(`knit + b${backN1+backNShift} ${carrier}`); //new
			} else if (((row_count % mod) === (mod-1)) && ((dir === '+' && side === 'right') || (dir === '-' && side === 'left'))) {//last one //new
				generated.push(';extra pass to prevent float'); //remove //debug
				// generated.push('rack 0.25');
				if (dir === '+') POSHOLE(true);
				else NEGHOLE(true);
				// generated.push('rack 0');
			} else {
				if (dir === '+') generated.push(`knit + b${backN1} ${carrier}`, `knit + b${backN1+backNShift} ${carrier}`, `knit + b${backN1+(backNShift*2)} ${carrier}`); //new
				else generated.push(`knit - b${backN1+(backNShift*2)} ${carrier}`, `knit - b${backN1+backNShift} ${carrier}`, `knit - b${backN1} ${carrier}`); //new
				// if (side === 'right') generated.push(`knit ${dir} b${min} ${carrier}`); //new //check //TODO: maybe make this a twisted stitch?
				// else generated.push(`knit ${dir} b${max} ${carrier}`);
			}
			// for (let n = min; n <= max; ++n) { //new location
			// 	avoid.push(n); //new
			// }
		}
	}

	// return [generated, avoid];
	return generated;
}

// function generateHorizButtonhole(buttonLeft, buttonRight, dir, carrier, side, action) {
function generateHorizButtonhole(buttonLeft, buttonRight, dir, carrier, action) {
	// let buttonWidth = (options ? options.buttonWidth : 6); //TODO: find the optimal button width
	// let spaceBtwHoles = (options ? options.spaceBtwHoles : 5); //TODO: find the optimal space between holes //10 //?

	generated.push(';stitch pattern: Horizontal Buttonhole');
	// if (row_count % spaceBtwHoles === 0) { //buttonhole time (bindoff)
	if (action === 'bindoff') { //buttonhole time (bindoff)
		generated.push('x-roller-advance 100');
		generated.push(`x-xfer-stitch-number ${Math.ceil(stitch_number/2)}`); //new //check
		//TODO: see if we need to set xfer stitch number
		// let buttonLeft, buttonRight;
		// if (side === 'right') {
		// 	buttonLeft = min;
		// 	buttonRight = min+buttonWidth;
		// } else {
		// 	buttonLeft = max-buttonWidth;
		// 	buttonRight = max;
		// }

		for (let n = buttonLeft; n <= buttonRight; ++n) { //bindoff
			generated.push(`xfer f${n} b${n}`);
		}

		if (dir === '+') {
			for (let n = buttonLeft; n <= buttonRight; ++n) { //bindoff
				generated.push(`knit + b${n} ${carrier}`);
				if (n === buttonLeft) generated.push(`knit - b${n+1} ${carrier}`); //twisted stitch, just to get bindoff going //new //TODO: //check on machine
				else generated.push(`tuck - b${n-1} ${carrier}`);
				// else generated.push('x-add-roller-advance -100', `tuck - b${n-1} ${carrier}`);

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
				// else generated.push('x-add-roller-advance -100', `tuck - b${n+1} ${carrier}`);

				generated.push(`xfer b${n} f${n}`);
				generated.push('rack 1');
				generated.push(`xfer f${n} b${n-1}`);
				generated.push('rack 0');

				if (n < buttonRight) generated.push('x-add-roller-advance -100', `drop b${n+1}`);
			}
		}
		generated.push(`x-roller-advance ${roller_advance}`);
	// } else if (row_count % spaceBtwHoles === 1) { //cast back on
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

//-------------------------------
//--- MAIN PATTERN FUNCTION ---//
//-------------------------------
// function avoidNeedleRange(pattern, row, min, max) { //new //TODO: make this work better for rib and seed (or tuck along needles that are empty and then drop to get other carriers to other side)
// 	let avoidNs = [];
// 	//patterns that involve avoiding some needles:
// 	if (!frontOnlyPatterns.includes(pattern.name) || pattern.name === 'Lace') {
// 		if (pattern.name === 'Buttonholes') {
// 			let buttonHeight = (options ? options.buttonHeight : 7); //TODO: find the optimal button height
// 			let spaceBtwHoles = (options ? options.spaceBtwHoles : 8); //TODO: find the optimal space between holes //10 //?
// 			let mod = buttonHeight + spaceBtwHoles;
// 			console.log('row!:', row, (row % mod), (row % mod) > spaceBtwHoles); //remove //debug
// 			// if ((row % mod) > spaceBtwHoles) { // >= //? //should avoid for one after?
// 			// if ((row % mod) > spaceBtwHoles && (row % mod) !== (mod-1)) { // >= //? //should avoid for one after?
// 			// if ((row % mod) > spaceBtwHoles && (row % mod) !== 0) { // >= //? //should avoid for one after?
// 			if ((row % mod) >= spaceBtwHoles) { // >= //? //should avoid for one after?
// 				for (let n = min; n <= max; ++n) {
// 					avoidNs.push(n); //new
// 				}
// 			}
// 		} else {
// 			for (let n = min; n <= max; ++n) {
// 				avoidNs.push(n);
// 			}
// 		}
// 	}

// 	return avoidNs;
// }


// function generatePattern(pattern, row, min, max, dir, speed, stitch, roller, width, backpassCarrier, avoid) {
// function generatePattern(pattern, row, min, max, dir, speed, stitch, roller, width, backpassCarrier) {
// function generatePattern(pattern, row, min, max, generate, dir, speed, stitch, roller, width, backpassCarrier) {
function generatePattern(pattern, row, min, max, generate, dir, speed, stitch, roller, width, currentCarrier, backpassCarrier) {
	generated = [];
	avoid = [];

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
	if (!generate && avoidAll.includes(patternName)) { //Lace and Buttonholes
		let pMin = min,
			pMax = max;
		if (patternName === 'Buttonholes') {
			let buttonHeight = (options ? options.buttonHeight : 6); //TODO: find the optimal button height
			let spaceBtwHoles = (options ? options.spaceBtwHoles : 5); //TODO: find the optimal space between holes //10 //?
			let mod = buttonHeight + spaceBtwHoles;

			if ((row_count % mod) < spaceBtwHoles) { //don't avoid edge-most needle by button hole if not knitting hole rn
				if (pattern.side === 'right') pMin += 3;
				else pMax -= 3; 
			}
		}

		for (let n = pMin; n <= pMax; ++n) {
			avoid.push(n); //new
		}
		return avoid;
	} else {
		if (patternName.includes('Rib')) {
			let sequence;
			if (patternName === 'Rib 1x1') sequence = 'fb';
			else if (patternName === 'Rib 2x2') sequence = 'ffbb';
			// let pattern = "bbffbf";
			return generateRib(sequence, min, max, dir, pattern.carrier, pattern);
		} else if (patternName === 'Seed') return generateSeed(min, max, dir, pattern.carrier);
		else if (patternName === 'Bubbles') {
			if (generate) return generateBubbles(min, max, dir, pattern.carrier);
			else return [];
		} else if (patternName === 'Lace') return generateLace(min, max, dir, pattern.carrier);
		else if (patternName === 'Buttonholes') return generateButtonHole(min, max, dir, pattern.carrier, pattern.side); //new
		else if (patternName === 'Horizontal Buttonholes') return generateHorizButtonhole(min, max, dir, currentCarrier, pattern.action);
		// else if (patternName === 'Horizontal Buttonholes') return generateHorizButtonhole(min, max, dir, currentCarrier, pattern.side, pattern.action);
		// if (name === 'Rib') return generateRib(sequence, min, max, dir, carrier);
	}
}

module.exports = { frontOnlyPatterns, generatePattern };