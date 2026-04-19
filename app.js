const pieceCSSMap = {
	p: 'bp',
	n: 'bn',
	b: 'bb',
	r: 'br',
	q: 'bq',
	k: 'bk',
	P: 'wp',
	N: 'wn',
	B: 'wb',
	R: 'wr',
	Q: 'wq',
	K: 'wk',
};

const files = [
	'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'
];

class ChessUI {
	constructor(boardInstance) {
		this.board = boardInstance;
		this.boardWrapper = document.getElementById('chess-container');
		this.squaresLayer = document.getElementById('squares-layer');
		this.piecesLayer = document.getElementById('pieces-layer');

		// 
		this.hintsLayer = document.createElement('div');
		this.hintsLayer.className = 'hints-board';
		this.boardWrapper.insertBefore(this.hintsLayer, this.piecesLayer);

		this.selectedSquare = null;
		this.validMoves = [];

		this.initGrid();
		this.renderPieces();
		this.attachEventListeners();
	}


	initGrid() {
		this.squaresLayer.innerHTML = '';
		for (let r = 0; r < 8; r++) {
			for (let c = 0; c < 8; c++) {
				const square = document.createElement('div');
				const isLight = (r + c) % 2 === 0;
				square.className = `square ${isLight ? 'light' : 'dark'}`;

				square.innerHTML = `<p class="tooltip rank ${isLight ? 'dark' : 'light'}"> ${c === 0 ? (8 - r) : ''}</p>
									<p class="tooltip file ${isLight ? 'dark' : 'light'}">${r === 7 ? files[c] : ''} </p>`;

				this.squaresLayer.appendChild(square);
			}
		}
	}

	attachEventListeners() {
		// xd enves de usar 64 divs reviso q seccion del tablero se hizo click
		this.boardWrapper.addEventListener('mousedown', (e) => {
			const rect = this.boardWrapper.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;

			const c = Math.floor(x / (rect.width / 8));
			const r = Math.floor(y / (rect.height / 8));

			if (r >= 0 && r < 8 && c >= 0 && c < 8) {
				this.handleSquareInteraction([r, c]);
			}
		});
	}

	handleSquareInteraction(targetSquare) {
		const matrix = this.board.getBoardMatrix();
		const targetPiece = matrix[targetSquare[0]][targetSquare[1]];

		// revisar el turno actual
		const activeColor = this.board.state.split(' ')[1];
		const isTargetWhite = this.board.isWhite(targetPiece);
		const isTargetBlack = this.board.isBlack(targetPiece);

		const isOwnPiece =
			targetPiece !== '' &&
			((activeColor === 'w' && isTargetWhite) ||
				(activeColor === 'b' && isTargetBlack));

		// case 1: nothing selected
		if (!this.selectedSquare) {
			if (isOwnPiece) this.selectPiece(targetSquare, matrix);
			return;
		}

		// case 2: click on the same piece to deselect
		if (
			this.selectedSquare[0] === targetSquare[0] &&
			this.selectedSquare[1] === targetSquare[1]
		) {
			this.clearSelection();
			return;
		}

		// case 3: click on another of your piece to switch selection
		if (isOwnPiece) {
			this.selectPiece(targetSquare, matrix);
			return;
		}

		// case 4: try the movement
		const isValid = this.validMoves.some(
			(m) => m[0] === targetSquare[0] && m[1] === targetSquare[1],
		);

		if (isValid) {
			const startSq = this.selectedSquare;
			this.clearSelection();

			const physicsPayload = this.board.makeMove(startSq, targetSquare, this);

			if (physicsPayload) {
				// block the ui from the mouse
				this.boardWrapper.style.pointerEvents = 'none';

				this.animateSingleMove(startSq, targetSquare, async () => {
					// animar el bubblesort
					await this.playSweepAnimation(physicsPayload);

					// renderizar
					this.renderPieces();
					this.boardWrapper.style.pointerEvents = 'auto';
				});
			}
		} else {
			this.clearSelection();
		}
	}

	selectPiece(square, matrix) {
		this.selectedSquare = square;
		this.validMoves = [];

		// predecir movimientos legales
		for (let r = 0; r < 8; r++) {
			for (let c = 0; c < 8; c++) {
				if (this.board.resolveMove(square, [r, c])) {
					this.validMoves.push([r, c]);
				}
			}
		}
		this.renderHints(matrix);
	}

	clearSelection() {
		this.selectedSquare = null;
		this.validMoves = [];
		this.hintsLayer.innerHTML = '';
	}

	renderHints(matrix) {
		this.hintsLayer.innerHTML = '';

		const highlight = document.createElement('div');
		highlight.className = 'highlight-selected';
		highlight.style.transform = `translate(${this.selectedSquare[1] * 100}%, ${this.selectedSquare[0] * 100}%)`;
		this.hintsLayer.appendChild(highlight);

		this.validMoves.forEach((move) => {
			const hint = document.createElement('div');
			const isCapture = matrix[move[0]][move[1]] !== '';

			hint.className = `hint-wrapper`;
			hint.style.transform = `translate(${move[1] * 100}%, ${move[0] * 100}%)`;

			const hintVisual = document.createElement('div');
			hintVisual.className = isCapture ? 'hint-capture' : 'hint-dot';
			hint.appendChild(hintVisual);
			this.hintsLayer.appendChild(hint);
		});
	}

	animateSingleMove(start, end, callback) {
		const piece = document.querySelector(
			`.piece[data-r="${start[0]}"][data-c="${start[1]}"]`,
		);
		const targetPiece = document.querySelector(
			`.piece[data-r="${end[0]}"][data-c="${end[1]}"]`,
		);

		if ( targetPiece && (
			targetPiece.className.includes('bk') ||
			targetPiece.className.includes('wk'))
		) this.handleCheckmate(targetPiece.className);
			if (targetPiece) targetPiece.remove();

		if (piece) {
			piece.style.transform = `translate(${end[1] * 100}%, ${end[0] * 100}%)`;
			piece.dataset.r = end[0];
			piece.dataset.c = end[1];
			setTimeout(callback, 250); // could it be you? fuck you
		} else {
			callback();
		}
	}

	async sleep(ms) { // little shit
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	async playSweepAnimation(payload) {
		const frames = payload.frames;
		const animationSpeed = 50; // might add a slider in the frontend

		for (let step = 0; step < frames.length; step++) {
			const actions = frames[step];

			this.hintsLayer.innerHTML = ''; // clear hints
			actions.forEach((action) => {
				this.drawSortHint(action.r, action.c1, 'compare-blue');
				this.drawSortHint(action.r, action.c2, 'compare-blue');
			});
			await this.sleep(animationSpeed);

			this.hintsLayer.innerHTML = '';
			actions.forEach((action) => {
				const colorClass = action.type === 'swap' ? 'swap-green' : 'noswap-red';
				this.drawSortHint(action.r, action.c1, colorClass);
				this.drawSortHint(action.r, action.c2, colorClass);

				if (action.type === 'swap') {
					const nodeA = document.querySelector(
						`.piece[data-r="${action.r}"][data-c="${action.c1}"]`,
					);
					const nodeB = document.querySelector(
						`.piece[data-r="${action.r}"][data-c="${action.c2}"]`,
					);

					if (nodeA) {
						nodeA.style.transform = `translate(${action.c2 * 100}%, ${action.r * 100}%)`;
						nodeA.dataset.c = action.c2;
					}
					if (nodeB) {
						nodeB.style.transform = `translate(${action.c1 * 100}%, ${action.r * 100}%)`;
						nodeB.dataset.c = action.c1;
					}
				}
			});
			await this.sleep(animationSpeed);
		}

		// green verification at the end, is supposed to highlight only sorted pieces
		this.hintsLayer.innerHTML = '';
		for (let r = 0; r < 8; r++) {
			if (!payload.buffers.includes(8 - r)) {
				// console.log(r)
				if (r >= 4) this.drawSortHint(r, 7, 'swap-green');
				if (r < 4) this.drawSortHint(r, 0, 'swap-green');
			}
		}
		await this.sleep(300); 
		this.hintsLayer.innerHTML = '';
	}

	handleCheckmate(targetPiece) { // really its a king capture ig
		const win = targetPiece.includes('bk') ? 1 : targetPiece.includes('wk') ? 0 : -1
		if (win == -1) throw Error(`${targetPiece} does not imply checkmate, no win state exists`);
		if (win === 1) {
			// block the ui from the mouse
			this.boardWrapper.style.pointerEvents = 'none';
			alert('white wins');
		} else if (win === 0) { // planning to do more, just need basic checkmate handling
			// block the ui from the mouse
			this.boardWrapper.style.pointerEvents = 'none';
			alert('black wins');
		}
	}

	drawSortHint(r, c, colorClass) {
		// console.log(r)
		const hint = document.createElement('div');
		hint.className = `sort-overlay ${colorClass}`;
		hint.style.transform = `translate(${c * 100}%, ${r * 100}%)`;
		this.hintsLayer.appendChild(hint);
	}

	renderPieces(tempBoard) { // maybe make this async but i dont really know someoe helpe me pleasee
		this.piecesLayer.innerHTML = '';
		const matrix = tempBoard || this.board.getBoardMatrix();

		for (let r = 0; r < 8; r++) {
			for (let c = 0; c < 8; c++) {
				const char = matrix[r][c];
				if (char !== '') {
					const pieceDiv = document.createElement('div');
					pieceDiv.style.pointerEvents = 'none';
					pieceDiv.className = `piece ${pieceCSSMap[char]}`;
					pieceDiv.style.transform = `translate(${c * 100}%, ${r * 100}%)`;
					pieceDiv.dataset.r = r;
					pieceDiv.dataset.c = c;
					this.piecesLayer.appendChild(pieceDiv);
				}
			}
		}
	}
}


// console.log


document.addEventListener('DOMContentLoaded', () => {
	const gameBoard = new Board();
	new ChessUI(gameBoard);
});

// wa