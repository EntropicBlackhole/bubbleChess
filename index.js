class Board {
	constructor() {
		this.state = 'rnbqkbnr/pppppppp/4p3/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
	}

	getBoardMatrix() {
		let positions = this.state.split(' ')[0].split('/');
		positions = positions.map((list) => {
			return list.split('').flatMap((e) => {
				if (!isNaN(parseInt(e))) return Array(parseInt(e)).fill('');
				else return e;
			})
		})
		return positions;
	}
}

// "krnbqrbn/pppppppp/8/8/4P3/8/PPPP1PPP/NBRQBNRK w - - 0 1"

const board = new Board()

console.log(board.getBoardMatrix())