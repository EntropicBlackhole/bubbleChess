class Board {
	constructor() {
		this.state = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
		this.moves = [];
	} //obv starting position, maybe a switch with a position variation if we wanna play different types of chess?

	setEnPassant(coords) {
		let stateArray = this.state.split(' ');
		stateArray[3] = coords === 0 ? '-' : to_algebraic(coords);
		this.state = stateArray.join(' ');
		console.log(this.state);
	}

	getBoardMatrix() {
		let positions = this.state.split(' ')[0].split('/');
		positions = positions.map((list) => {
			return list.split('').flatMap((e) => {
				if (!isNaN(parseInt(e)))
					return Array(parseInt(e)).fill(''); // god tier
				else return e;
			});
		});
		return positions;
	}

	__setBoardStateFromMatrix(matrix) {
		const fenRows = matrix.map((row) => {
			let emptyCount = 0;
			let rowString = '';

			for (let char of row) {
				if (char === '') emptyCount++;
				else {
					if (emptyCount > 0) {
						rowString += emptyCount;
						emptyCount = 0;
					}
					rowString += char;
				}
			}
			if (emptyCount > 0) rowString += emptyCount;

			return rowString;
		});

		const newBoardFen = fenRows.join('/');
		const stateParts = this.state.split(' ');

		if (stateParts.length > 1) {
			const metadata = stateParts.slice(1).join(' ');
			this.state = `${newBoardFen} ${metadata}`;
		} else this.state = newBoardFen;

		return this.state;
	}

	isWhite = (piece) => {
		return piece !== '' && piece === piece.toUpperCase();
	};
	isBlack = (piece) => {
		return piece !== '' && piece === piece.toLowerCase();
	};

	performSweep(bufferRanks = []) {
		const valueMap = {
			'': 0,
			p: 1,
			n: 3,
			b: 3,
			r: 5,
			q: 9,
			k: Infinity,
			P: 1,
			N: 3,
			B: 3,
			R: 5,
			Q: 9,
			K: Infinity,
		};

		let matrix = this.getBoardMatrix();
		// 7 tick array
		let frames = [[], [], [], [], [], [], []];

		for (let step = 0; step < 7; step++) {
			// white sweep ltr
			for (let r = 4; r < 8; r++) {
				if (!bufferRanks.includes(8 - r)) {
					let c1 = step;
					let c2 = step + 1;
					let didSwap = valueMap[matrix[r][c1]] > valueMap[matrix[r][c2]];

					if (didSwap) {
						let temp = matrix[r][c1];
						matrix[r][c1] = matrix[r][c2];
						matrix[r][c2] = temp;
					}
					frames[step].push({
						type: didSwap ? 'swap' : 'noswap',
						r: r,
						c1: c1,
						c2: c2,
					});
				}
			}

			// black sweep rtl
			for (let r = 0; r < 4; r++) {
				if (!bufferRanks.includes(8 - r)) {
					let c1 = 7 - step;
					let c2 = 6 - step;
					let didSwap = valueMap[matrix[r][c1]] > valueMap[matrix[r][c2]];

					if (didSwap) {
						let temp = matrix[r][c1];
						matrix[r][c1] = matrix[r][c2];
						matrix[r][c2] = temp;
					}
					frames[step].push({
						type: didSwap ? 'swap' : 'noswap',
						r: r,
						c1: c1,
						c2: c2,
					});
				}
			}
		}

		this.state = this.__setBoardStateFromMatrix(matrix);
		return { fen: this.state, frames: frames, buffers: bufferRanks };
	}

	makeMove(from, to) {
		if (!this.resolveMove(from, to)) return false;

		let matrix = this.getBoardMatrix();
		let piece = matrix[from[0]][from[1]];

		// whyy
		this.pushAlgebraicMove(from, to, matrix[to[0]][to[1]]);

		if (piece === 'P' && to[0] === 0) piece = 'Q';
		if (piece === 'p' && to[0] === 7) piece = 'q';

		// Check for en-passant
		if (
			(piece === 'p' || piece === 'P') &&
			to_algebraic(to) === this.state.split(' ')[3]
		) {
			// console.log('en passant detected')

			const epSlot = [piece === 'p' ? to[0] - 1 : to[0] + 1, to[1]];

			// console.log(epSlot);
			matrix[epSlot[0]][epSlot[1]] = '';
			//why the fuck wont you work

			// For some reason, the piece gets removed from the board AFTER the bubble sweep is completed.
			// Probably because of how the board renders (?)

			// this is a known bug with pawn promotions too, the same thing happens and ive spent countless hours trying to fix it to no avail
			// ive played around with the rendering functions and promotion logic but nothing, i think it probably has to do with the fact
			// that promotions need to happen async to run on a different thread than the board sweep

			// wait nonon i think this has to do with the playSweepAnimation function in app.js, the board is capable of making the promotion on the spot
			// but the render is only noticing that afterwards

			// update: still not fucking fixed
			// before, only god and i knew how this code worked
			// now, no one fking knows
			// if you ever find this, and are trying to debug this, pleas update the following counter
			// hours lost to the heat death of the universe, wasted here: 7
		}
		// console.log(epSlot);

		// Check for pawn double advance move
		if ((piece === 'p' || piece === 'P') && Math.abs(to[0] - from[0]) === 2) {
			const epSlot = [(from[0] + to[0]) / 2, to[1]];

			this.setEnPassant(epSlot);
			// console.log(this.state);
		} else {
			this.setEnPassant(0);
		}

		// console.log(piece)
		matrix[to[0]][to[1]] = piece;
		matrix[from[0]][from[1]] = '';
		this.state = this.__setBoardStateFromMatrix(matrix);
		// console.log(this.state)
		// chessUI.clearSelection()
		// chessUI.renderPieces()

		let startRank = 8 - from[0];
		let endRank = 8 - to[0];
		let buffers = [startRank];
		if (startRank !== endRank) buffers.push(endRank);

		let payload = this.performSweep(buffers);

		let stateParts = this.state.split(' ');
		stateParts[1] = stateParts[1] === 'w' ? 'b' : 'w';
		this.state = stateParts.join(' ');
		payload.fen = this.state;

		return payload;
	}

	resolveMove(start, end) {
		//q hermoso
		const matrix = this.getBoardMatrix();
		const piece = matrix[start[0]][start[1]];
		const target = matrix[end[0]][end[1]];

		if (piece === '' || (start[0] === end[0] && start[1] === end[1]))
			return false;

		// turn validation
		const activeColor = this.state.split(' ')[1]; // extrae 'w' o 'b' del fen
		if (activeColor === 'w' && this.isBlack(piece)) return false;
		if (activeColor === 'b' && this.isWhite(piece)) return false;

		// no friendly fire
		if (target !== '') {
			if (this.isWhite(piece) && this.isWhite(target)) return false;
			if (this.isBlack(piece) && this.isBlack(target)) return false;
		}

		const deltaR = end[0] - start[0];
		const deltaC = end[1] - start[1];
		const absDr = Math.abs(deltaR);
		const absDc = Math.abs(deltaC);
		const type = piece.toLowerCase();

		// console.log(deltaR, deltaC);

		// console.log(type)

		switch (
			type // dont EVER touch this, fuck this shit
		) {
			case 'n':
				return (absDr === 2 && absDc === 1) || (absDr === 1 && absDc === 2);
			case 'k':
				return absDr <= 1 && absDc <= 1;
			case 'r':
				if (absDr !== 0 && absDc !== 0) return false;
				return this.__checkLineOfSight(matrix, start, end, deltaR, deltaC);
			case 'b':
				if (absDr !== absDc) return false;
				return this.__checkLineOfSight(matrix, start, end, deltaR, deltaC);
			case 'q':
				if (absDr !== 0 && absDc !== 0 && absDr !== absDc) return false;
				return this.__checkLineOfSight(matrix, start, end, deltaR, deltaC);
			case 'p':
				const dir = this.isWhite(piece) ? -1 : 1;
				const startRank = this.isWhite(piece) ? 6 : 1;
				// console.log(dir)

				const enpassant = this.state.split(' ')[3]; // en passant coordinates

				if (deltaC === 0) {
					if (deltaR === dir && target === '') return true;
					if (
						deltaR === dir * 2 &&
						start[0] === startRank &&
						target === '' &&
						matrix[start[0] + dir][start[1]] === ''
					)
						return true;
				} else if (
					absDc === 1 &&
					deltaR === dir &&
					((enpassant === '-' ? false : to_algebraic(end) === enpassant) ||
						target !== '')
				) {
					return true;
				}
				return false;
		}
		return false;
	}

	__checkLineOfSight(matrix, start, end, deltaR, deltaC) {
		// raytracing much?
		const stepR = Math.sign(deltaR);
		const stepC = Math.sign(deltaC);
		let currR = start[0] + stepR;
		let currC = start[1] + stepC;

		while (currR !== end[0] || currC !== end[1]) {
			if (matrix[currR][currC] !== '') return false;
			currR += stepR;
			currC += stepC;
		}
		return true;
	}

	pushAlgebraicMove(from, to, capture) {
		const stateParts = this.state.split(' ');
		const newLine = stateParts[1] === 'w';

		const matrix = this.getBoardMatrix();
		const piece = matrix[from[0]][from[1]];

		let move = '';
		let attacks = [];

		if (piece != 'P' && piece != 'p') {
			move += piece.toUpperCase();

			// Dissambiguate:
			// Will check if there are other pieces that could perform the same move and, in that case, will
			// dissambiguate by specifying the file or rank, in that order of preference.

			let conflicts = [];

			const deltaB = [
				[1, 1],
				[-1, -1],
				[1, -1],
				[-1, 1],
			];

			const deltaN = [
				[2, 1],
				[2, -1],
				[-2, 1],
				[-2, -1],
				[1, 2],
				[1, -2],
				[-1, 2],
				[-1, -2],
			];

			const deltaR = [
				[1, 0],
				[0, 1],
				[-1, 0],
				[0, -1],
			];

			switch (piece.toUpperCase()) {
				case 'N':
					for (let v of deltaN) {
						if (
							to[0] + v[0] < 0 ||
							to[0] + v[0] > 7 ||
							to[1] + v[1] < 0 ||
							to[1] + v[1] > 7
						) {
							continue;
						}

						if (matrix[to[0] + v[0]][to[1] + v[1]] === piece) {
							conflicts.push([to[0] + v[0], to[1] + v[1]]);
						}

						if (matrix[to[0] + v[0]][to[1] + v[1]] != '') {
							attacks.push(matrix[to[0] + v[0]][to[1] + v[1]]);
						}
					}

					break;

				case 'B':
					for (let v of deltaB) {
						let i = 1;
						while (
							to[0] + i * v[0] > 0 &&
							to[0] + i * v[0] < 8 &&
							to[1] + i * v[1] > 0 &&
							to[1] + i * v[1] < 8
						) {
							const sq = matrix[(to[0] + i * v[0], to[1] + i * v[1])];
							if (sq != '') {
								if (sq === piece) {
									conflicts.push([to[0] + i * v[0], to[1] + i * v[1]]);
								}

								attacks.push(sq);

								break;
							}
						}
					}

					break;

				case 'R':
					for (let v of deltaR) {
						let i = 1;
						while (
							to[0] + i * v[0] > 0 &&
							to[0] + i * v[0] < 8 &&
							to[1] + i * v[1] > 0 &&
							to[1] + i * v[1] < 8
						) {
							const sq = matrix[(to[0] + i * v[0], to[1] + i * v[1])];
							if (sq != '') {
								if (sq === piece) {
									conflicts.push([to[0] + i * v[0], to[1] + i * v[1]]);
								}

								attacks.push(sq);

								break;
							}
						}
					}

					break;

				case 'Q':
					for (let v of deltaR) {
						let i = 1;
						while (
							to[0] + i * v[0] > 0 &&
							to[0] + i * v[0] < 8 &&
							to[1] + i * v[1] > 0 &&
							to[1] + i * v[1] < 8
						) {
							const sq = matrix[(to[0] + i * v[0], to[1] + i * v[1])];
							if (sq != '') {
								if (sq === piece) {
									conflicts.push([to[0] + i * v[0], to[1] + i * v[1]]);
								}

								attacks.push(sq);

								break;
							}
						}
					}

					for (let v of deltaB) {
						let i = 1;
						while (
							to[0] + i * v[0] > 0 &&
							to[0] + i * v[0] < 8 &&
							to[1] + i * v[1] > 0 &&
							to[1] + i * v[1] < 8
						) {
							const sq = matrix[(to[0] + i * v[0], to[1] + i * v[1])];
							if (sq != '') {
								if (sq === piece) {
									conflicts.push([to[0] + i * v[0], to[1] + i * v[1]]);
								}

								attacks.push(sq);

								break;
							}
						}
					}

					break;
			}

			if (conflicts > 1) {
				let dissambiguateType = 0;

				for (let c of conflicts) {
					if (c[1] === from[1] && c != from) {
						// Two pieces in the same file
						dissambiguateType += 1;
						break;
					}
				}

				for (let c of conflicts) {
					if (c[0] === from[0] && c != from) {
						// Two pieces in the same rank
						dissambiguateType += 2;
						break;
					}
				}

				switch (dissambiguateType) {
					case 0:
						move += to_algebraic(from).charAt(0);
						break;

					case 1:
						move += to_algebraic(from).charAt(1);
						break;

					case 2:
						move += to_algebraic(from).charAt(0);
						break;

					case 3:
						move += to_algebraic(from);
						break;
				}
			}

			// Captures
			if (capture != '') {
				move += 'x';
			}
		} else {
			if (capture != '') {
				move += to_algebraic(from).charAt(0) + 'x';
			}
		}

		// Destination
		move += to_algebraic(to);

		// Promotion (currently, forced to queen, so 'e8=Q')
		if (
			piece.toLowerCase() === 'p' &&
			to[0] === (piece.toLowerCase() === piece ? 7 : 0)
		) {
			move += '=Q';
		}

		// Check or Checkmate notation
		for (let p of attacks) {
			if (capture === 'K' || capture === 'k') {
				move += '#';
				break;
			}

			if (
				(piece.toUpperCase() === piece && p === 'k') ||
				(piece.toLowerCase() === piece && p === 'K')
			) {
				move += '+';
				break;
			}
		}

		if (newLine) {
			move = String(this.moves.length + 1) + '. ' + move;
			this.moves.push(move);
		} else {
			this.moves[this.moves.length - 1] += ' ' + move;
		}

		// DEBUG
		console.log(this.moves);
	}
}

// "krnbqrbn/pppppppp/8/8/4P3/8/PPPP1PPP/NBRQBNRK w - - 0 1"

let board = new Board();

// console.log(board.performSweep([2, 4]));

function bubbleSort(list, valueMap) {
	// the heart of it all
	// this supports a valueMap, so we can do shit like swapping two pieces based on value, keeping those pieces as chars
	// let isSorted = true;
	for (let i = 0; i < list.length - 1; i++) {
		if (valueMap[list[i]] > valueMap[list[i + 1]]) {
			// isSorted = false;
			let a = list[i];
			let b = list[i + 1];

			list[i] = b;
			list[i + 1] = a;
		}
	}
	// if (isSorted) return list;
	// else return bubbleSort(list, valueMap)
	return list;
}

function to_matricial(arg) {
	const row = 8 - Number(arg[1]);
	const col = arg.charCodeAt(0) - 97; // a = 97

	return [row, col];
}

function to_algebraic(arg) {
	const file = String.fromCharCode(arg[1] + 97);
	const rank = 8 - arg[0].toString();

	// console.log(file + rank);
	return file + rank;
}

/*
	DEBUGGING:
	Add here the move list. Every move has the following structure: [from, to]
*/
// const moves = [
// 	['e2', 'e4'],
// 	['e7', 'e5'],
// 	['b2', 'b3'],
// 	['f8', 'c4'],
// ]; // vole

// _debug_printBoard(board.getBoardMatrix());

// for (let move of moves) {
// 	board.makeMove(to_matricial(move[0]), to_matricial(move[1]));
// 	_debug_printBoard(board.getBoardMatrix());
// }

// board.makeMove(to_matricial('e2'), to_matricial('e4'));
// console.log('after:', board.getBoardMatrix());

// console.log(bubbleSort([3, 6, 3, 2, 3, 13, 9, 1, 4]))

function rotateMatrix(matrix) {
	//assuming it's as deep as 2 levels
	const returnMatrix = [];
	for (let i = matrix.length - 1; i >= 0; i--) {
		returnMatrix.push(matrix[i].toReversed()); // get rotated idiot
	}
	return returnMatrix; // insert shark being flipped from (x, y) to (-y, x) by diver
}

function _debug_printBoard(boardMatrix) {
	console.log('---------------');

	let boardDisplay = '';
	for (let r = 0; r < 8; r++)
		for (let c = 0; c < 9; c++) {
			if (c === 8) {
				console.log(boardDisplay);
				boardDisplay = '';
				continue;
			}

			if (boardMatrix[r][c] === '') {
				boardDisplay += (r + c) % 2 === 0 ? '.' : ' ';
			} else {
				boardDisplay += boardMatrix[r][c];
			}

			boardDisplay += ' ';
		}
}
