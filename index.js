class Board {
	constructor() {
		this.state = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
	}

	getBoardMatrix() {
		let positions = this.state.split(' ')[0].split('/');
		positions = positions.map((list) => {
			return list.split('').flatMap((e) => {
				if (!isNaN(parseInt(e))) return Array(parseInt(e)).fill('');
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

	performSweep(bufferRanks = []) {
		// an array of ranks that are buffered, usually one when the movement is horizontal or two otherwise
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

		const boardMatrix = this.getBoardMatrix();

		// first split in half and rotate top half

		let blackSide = [];
		for (let i = 0; i < 4; i++) blackSide.push(boardMatrix.shift());

		let whiteSide = boardMatrix;
		blackSide = rotateMatrix(blackSide);

		for (let i = 0; i < 4; i++) {
			let currentWhiteRank = 4 - i;
			let currentBlackRank = 5 + i;

			// if that rank is NOT in the buffer list, sweep it
			if (!bufferRanks.includes(currentWhiteRank))
				bubbleSort(whiteSide[i], valueMap);

			// if that rank is NOT in the buffer list, sweep it
			if (!bufferRanks.includes(currentBlackRank))
				bubbleSort(blackSide[i], valueMap);
		}

		// we flip back the black side of the board and compose the full board.
		blackSide = rotateMatrix(blackSide);
		const resultMatrix = [...blackSide, ...whiteSide];

		return this.__setBoardStateFromMatrix(resultMatrix);
	}
}

// "krnbqrbn/pppppppp/8/8/4P3/8/PPPP1PPP/NBRQBNRK w - - 0 1"

let board = new Board();

console.log(board.performSweep([2, 4]));

function bubbleSort(list, valueMap) {
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

// console.log(bubbleSort([3, 6, 3, 2, 3, 13, 9, 1, 4]))

function rotateMatrix(matrix) {
	//asuming its as deep as 2 levels
	const returnMatrix = [];
	for (let i = matrix.length - 1; i >= 0; i--) {
		returnMatrix.push(matrix[i].toReversed());
	}
	return returnMatrix;
}
