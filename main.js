class Tetris {
    constructor(scene, stopGameFunc, htmlObjects) {
        this.scene = scene;
        this.stopGameFunc = stopGameFunc;
        this.numColumns = 12;
        this.numRows = 24;
        this.started = false;
        this.score = 0;
        this.level = 1;
        this.round = 1;
        this.htmlObjects = htmlObjects;

        this.texture = new THREE.TextureLoader().load('./cross-scratches.png');
        this.texture.wrapS = THREE.RepeatWrapping;
        this.texture.wrapT = THREE.RepeatWrapping;
        this.texture.repeat.set(4, 4);

        this.updateScoreLevelRoundText();

        const playFieldGridGeometry = new THREE.BufferGeometry();

        let vertexArray = [];
        for (let column = 0; column <= this.numColumns; column++) {
            for (let row = 0; row <= this.numRows+4; row++) {
                if (row > 0)
                    vertexArray.push(column, row, 0, column, row - 1, 0);
                if (row < this.numRows)
                    vertexArray.push(column, row, 0, column, row + 1, 0);
                if (column > 0 && row !== this.numRows)
                    vertexArray.push(column, row, 0, column - 1, row, 0);
                if (column < this.numColumns && row !== this.numRows)
                    vertexArray.push(column, row, 0, column + 1, row, 0);
            }
        }

        for (let column = 0; column <= this.numColumns; column++) {
            for (let depth = 0; depth <= 1; depth++) {
                if (depth > 0)
                    vertexArray.push(column, 0, depth, column, 0, depth - 1);
                if (depth < 1)
                    vertexArray.push(column, 0, depth, column, 0, depth + 1);
                if (column > 0)
                    vertexArray.push(column, 0, depth, column - 1, 0, depth);
                if (column < this.numColumns)
                    vertexArray.push(column, 0, depth, column + 1, 0, depth);
            }
        }

        const playFieldVertices = new Float32Array(vertexArray);
        playFieldGridGeometry.setAttribute('position', new THREE.BufferAttribute(playFieldVertices, 3));

        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 1,
            linecap: 'round',
            linejoin: 'round'
        });

        const playFieldGrid = new THREE.LineSegments(playFieldGridGeometry, lineMaterial);
        this.scene.add(playFieldGrid);

        const topRowVertices = new Float32Array([
                          0, this.numRows, 0,
            this.numColumns, this.numRows, 0,
            this.numColumns, this.numRows, 1,
                          0, this.numRows, 1,
                          0, this.numRows, 0
        ]);

        const topRowGridGeometry = new THREE.BufferGeometry();
        topRowGridGeometry.setAttribute('position', new THREE.BufferAttribute(topRowVertices, 3));
        const secondLineMaterial = new THREE.LineBasicMaterial({
            color: 0xff0000,
            linewidth: 1,
            linecap: 'round',
            linejoin: 'round'
        });

        const topRowGrid = new THREE.Line(topRowGridGeometry, secondLineMaterial);
        this.scene.add(topRowGrid);
    }

    start() {
        if (this.started)
            return;

        this.started = true;
        this.playField = [];
        for (let x = 0; x < this.numColumns; x++) {
            let temp = [];
            for (let y = 0; y < this.numRows+4; y++) {
                temp.push(null);
            }
            this.playField.push(temp);
        }

        this.releaseTetromino();
        this.interval = setInterval(() => this.tick(), 1000);
    }

    stop() {
        clearInterval(this.interval);
        this.stopGameFunc(this.score);
        // setTimeout(() => location.reload(), 10000);
    }

    tick() {
        if (this.currentTetromino == null) {
            this.releaseTetromino();
        } else {
            this.translateCurrentDownOne();
        }
    }

    releaseTetromino() {
        let tetromino = getRandomTetromino();
        tetromino = tetromino.translate(this.numColumns/2, this.numRows);
        this.addCurrentTetromino(tetromino);
        return tetromino;
    }

    dropTetromino() {
        let currentBoxes = this.clearCurrentAndGetCurrentBoxes();

        let tempTetromino = this.currentTetromino.translate(0, -1);
        while(!this.hasCollision(tempTetromino)) {
            this.currentTetromino = tempTetromino;
            tempTetromino = this.currentTetromino.translate(0, -1);
        }

        this.updateBoxes(currentBoxes);
        for (let i = 0; i < this.currentTetromino.cubes.length; i++) {
            if (this.currentTetromino.cubes[i][1] >= this.numRows) {
                this.stop();
                this.currentTetromino = null;
                return;
            }
        }
        this.clearFullRows();
        this.currentTetromino = null;
        this.releaseTetromino();
    }

    addCurrentTetromino(tetromino) {
        this.currentTetromino = tetromino;
        for (let i = 0; i < tetromino.cubes.length; i++) {
            let x = tetromino.cubes[i][0];
            let y = tetromino.cubes[i][1];
            this.playField[x][y] = Tetris.buildTetrisCube(tetromino.material);
            this.playField[x][y].position.x += x;
            this.playField[x][y].position.y += y;
            this.scene.add(this.playField[x][y]);
        }
    }

    translateCurrentDownOne() {
        let currentBoxes = this.clearCurrentAndGetCurrentBoxes();

        let tempTetromino = this.currentTetromino.translate(0, -1);
        let hasCollision = this.hasCollision(tempTetromino);
        if (!hasCollision) {
            this.currentTetromino = tempTetromino;
        }

        this.updateBoxes(currentBoxes);
        if (hasCollision) {
            for (let i = 0; i < this.currentTetromino.cubes.length; i++) {
                if (this.currentTetromino.cubes[i][1] >= this.numRows) {
                    this.stop();
                    this.currentTetromino = null;
                    return;
                }
            }
            this.clearFullRows();
            this.currentTetromino = null;
            this.releaseTetromino();
        }
    }

    rotateCurrentLeft() {
        let currentBoxes = this.clearCurrentAndGetCurrentBoxes();

        let tempTetromino = this.currentTetromino.rotate();
        if (!this.hasCollision(tempTetromino)) {
            this.currentTetromino = tempTetromino;
        }

        this.updateBoxes(currentBoxes);
    }

    rotateCurrentRight() {
        let currentBoxes = this.clearCurrentAndGetCurrentBoxes();

        let tempTetromino = this.currentTetromino.rotate().rotate().rotate();
        if (!this.hasCollision(tempTetromino)) {
            this.currentTetromino = tempTetromino;
        }

        this.updateBoxes(currentBoxes);
    }

    hasCollision(tetromino) {
        for (let i = 0; i < this.currentTetromino.cubes.length; i++) {
            let x = tetromino.cubes[i][0];
            let y = tetromino.cubes[i][1];
            if (y < 0 || x >= this.numColumns || x < 0 || this.playField[x][y] != null) {
                return true;
            }
        }
        return false;
    }

    updateBoxes(currentBoxes) {
        let box;
        for (let i = 0; i < this.currentTetromino.cubes.length; i++) {
            let x = this.currentTetromino.cubes[i][0];
            let y = this.currentTetromino.cubes[i][1];
            box = currentBoxes[i];
            box.position.x = .5 + x;
            box.position.y = .5 + y;
            this.playField[x][y] = box;
        }
    }

    translateCurrentLeft() {
        let currentBoxes = this.clearCurrentAndGetCurrentBoxes();

        let tempTetromino = this.currentTetromino.translate(-1, 0);
        if (!this.hasCollision(tempTetromino)) {
            this.currentTetromino = tempTetromino;
        }

        this.updateBoxes(currentBoxes);
    }

    translateCurrentRight() {
        let currentBoxes = this.clearCurrentAndGetCurrentBoxes();

        let tempTetromino = this.currentTetromino.translate(1, 0);
        if (!this.hasCollision(tempTetromino)) {
            this.currentTetromino = tempTetromino;
        }

        this.updateBoxes(currentBoxes);
    }

    clearCurrentAndGetCurrentBoxes() {
        let currentBoxes = [];
        for (let i = 0; i < this.currentTetromino.cubes.length; i++) {
            let x = this.currentTetromino.cubes[i][0];
            let y = this.currentTetromino.cubes[i][1];
            currentBoxes.push(this.playField[x][y]);
            this.playField[x][y] = null;
        }
        return currentBoxes;
    }

    clearCurrentTetrominoSpaces() {
        for (let i = 0; i < this.currentTetromino.cubes.length; i++) {
            let x = this.currentTetromino.cubes[i][0];
            let y = this.currentTetromino.cubes[i][1];
            this.playField[x][y] = null;
        }
    }

    clearFullRows() {
        let rowsToClear = [];
        for (let i = 0; i < this.numRows; i++) {
            if (this.rowIsFull(i)) {
                rowsToClear.push(i);
            }
        }

        if (rowsToClear.length > 0)
        {
            for (let column = 0; column < this.numColumns; column++) {
                let index = 0;
                for (let row = 0; row < this.numRows; row++) {
                    let clearedRow = false;
                    let thisRowShouldBeCleared = rowsToClear.includes(row);
                    for (let i = 0; i < rowsToClear.length; i++) {
                        if (rowsToClear[i] === row) {
                            this.scene.remove(this.playField[column][row]);
                            this.playField[column][row] = null;

                            clearedRow = true;
                        }
                    }

                    let currentBox = this.playField[column][row];
                    if (currentBox != null) {
                        this.playField[column][row] = null;
                        this.playField[column][index] = currentBox;
                        let delta = row - index;
                        currentBox.position.y -= delta;
                    }

                    if (!clearedRow)
                        index++;

                    console.log(clearedRow === thisRowShouldBeCleared);
                }
            }

            this.score += rowsToClear.length * 30 * this.level +  Math.pow(2, rowsToClear.length - 1) * this.level;

            if (++this.round > 10)
            {
                this.level++;
                this.round = 1;
                clearInterval(this.interval);
                this.interval = setInterval(() => this.tick(), 1000 - (50 * (this.level - 1)));
            }

            this.updateScoreLevelRoundText();
        }
    }

    updateScoreLevelRoundText() {
        this.htmlObjects.score.children[1].innerHTML = this.score;
        this.htmlObjects.level.children[1].innerHTML = this.level;
        this.htmlObjects.round.children[1].innerHTML = this.round;
    }

    rowIsFull(row) {
        for (let i = 0; i < this.numColumns; i++) {
            if (this.playField[i][row] == null) {
                return false;
            }
        }

        return true;
    }

    static buildTetrisCube(material) {
        let temp = new THREE.BoxGeometry(.9, .9, .9);
        let tempMesh = new THREE.Mesh(temp, material);
        tempMesh.position.x = .5;
        tempMesh.position.y = .5;
        tempMesh.position.z = .5;
        return tempMesh;
    }
}

function setUpBackgroundCanvas() {
    // Set up background

    const backgroundCanvas = document.createElement('canvas');
    backgroundCanvas.id = 'backgroundCanvas';
    document.body.appendChild(backgroundCanvas);
    backgroundCanvas.height = document.body.clientHeight;
    backgroundCanvas.width = document.body.clientWidth;

    const backgroundContext = backgroundCanvas.getContext("2d");
    const gradient = backgroundContext.createLinearGradient(0, 0, document.body.clientWidth, 0);

    gradient.addColorStop(0, "black");
    gradient.addColorStop(.25, "dimgray");
    gradient.addColorStop(.5, "gray");
    gradient.addColorStop(.75, "dimgray");
    gradient.addColorStop(1, "black");

    backgroundContext.fillStyle = gradient;
    backgroundContext.fillRect(0, 0, document.body.clientWidth, document.body.clientHeight);
}

class Tetromino {
    constructor(cubes, pivotCube, material) {
        this.cubes = cubes; // should be of the form [ [x, y], [x, y], [x, y], [x, y]]
        this.pivotCube = pivotCube; // should be of the form [x, y]
        this.material = material; // should be of the type Material
    }

    // Rotate the tetromino 90 degrees counterclockwise
    rotate() {
        let originX = this.pivotCube[0];
        let originY = this.pivotCube[1];
        let tempCubes = [[0, 0], [0, 0], [0, 0], [0, 0]];
        this.cubes.forEach(rotateCube)

        function rotateCube(item, index) {
            let x = item[0];
            let y = item[1];
            tempCubes[index][0] = Math.round(originY - y + originX);
            tempCubes[index][1] = Math.round(x - originX + originY);
        }

        return new Tetromino(tempCubes, this.pivotCube, this.material);
    }

    // Translate the tetromino by x units right and y units up.
    translate(x, y) {
        let tempCubes = [[0, 0], [0, 0], [0, 0], [0, 0]];
        this.cubes.forEach(translateCube);
        let tempPivotCube = [0, 0];
        tempPivotCube[0] = this.pivotCube[0] + x;
        tempPivotCube[1] = this.pivotCube[1] + y;
        function translateCube(item, index) {
            tempCubes[index][0] = item[0] + x;
            tempCubes[index][1] = item[1] + y;
        }

        return new Tetromino(tempCubes, tempPivotCube, this.material);
    }

    // Build a Tetromino of Kind provided as a parameter
    static BuildTetromino(tetrominoKind) {
        let material;
        switch (tetrominoKind) {
            case TetrominoKind.I:
                let cyan = new THREE.Color(0, 1, 1);
                material = new THREE.MeshPhongMaterial({
                    color: cyan
                })
                return new Tetromino([[0,0],[1,0],[2,0],[3,0]],[1.5,0], material);
            case TetrominoKind.J:
                let blue = new THREE.Color(0, 0, 1);
                material = new THREE.MeshPhongMaterial({
                    color: blue
                });
                return new Tetromino([[0,0],[1,0],[1,1],[1,2]],[1,0], material);
            case TetrominoKind.L:
                let orange = new THREE.Color(1, .65, 0);
                material = new THREE.MeshPhongMaterial({
                    color: orange
                });
                return new Tetromino([[0,0],[0,1],[0,2],[1,0]],[0,0], material);
            case TetrominoKind.O:
                let yellow = new THREE.Color(1, 1, 0);
                material = new THREE.MeshPhongMaterial({
                    color: yellow
                });
                return new Tetromino([[0,0],[1,0],[0,1],[1,1]],[0.5,0.5], material);
            case TetrominoKind.S:
                let green = new THREE.Color(.4, 1, 0);
                material = new THREE.MeshPhongMaterial({
                    color: green
                });
                return new Tetromino([[0,0],[1,0],[1,1],[2,1]],[1,.5], material);
            case TetrominoKind.T:
                let magenta = new THREE.Color(1, 0, 1);
                material = new THREE.MeshPhongMaterial({
                    color: magenta
                });
                return new Tetromino([[0,1],[1,1],[1,0],[2,1]],[1,0], material);
            case TetrominoKind.Z:
                let red = new THREE.Color(1, 0, 0);
                material = new THREE.MeshPhongMaterial({
                    color: red
                });
                return new Tetromino([[0,1],[1,1],[1,0],[2,0]],[1,.5], material);
            default:
                throw "Unknown Tetromino Kind";
        }
    }
}

const TetrominoKind = {
    I: "i",
    O: "o",
    T: "t",
    J: "j",
    L: "l",
    S: "s",
    Z: "z"
}

function getRandomTetromino() {
    let keys = Object.keys(TetrominoKind);
    let tKind = TetrominoKind[keys[keys.length * Math.random() << 0]];
    return Tetromino.BuildTetromino(tKind);
}

function main() {

    setUpBackgroundCanvas();
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(90, window.innerWidth/window.innerHeight, .01, 1000);

    const renderer = new THREE.WebGLRenderer( {alpha: true, antialias: true});
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    renderer.domElement.id = "gameCanvas";

    const endGameModal = document.getElementById("endGameModal");
    const endGameScoreText = document.getElementById("endgameScoreText");

    function stopGame(finalScore) {
        endGameModal.classList.remove("deactivated");
        endGameScoreText.innerHTML = "<h2>Final Score</h2><p>"+finalScore+"</p>";
    }

    function animate() {
        requestAnimationFrame(animate);

        renderer.render(scene, camera);
    }

    const htmlObjectsForTetris = {
        score: document.getElementById("scoreDiv"),
        level: document.getElementById("levelDiv"),
        round: document.getElementById("roundDiv")
    };

    const tetris = new Tetris(scene, stopGame, htmlObjectsForTetris);

    const cameraDefaultPosition = {
        x: tetris.numColumns/2,
        y: (tetris.numRows+4)/2,
        z: 16
    };

    camera.position.x = cameraDefaultPosition.x;
    camera.position.y = cameraDefaultPosition.y;
    camera.position.z = cameraDefaultPosition.z;
    camera.personal = {degree: 0};

    const light = new THREE.PointLight(0xFFFFFF);
    light.position.set(5, 10, 20);
    scene.add(light);

    const startGameModal = document.getElementById("startGameModal");
    const startGameButton = document.getElementById("startGameButton");

    function startGame() {
        tetris.start();
        startGameButton.onclick = null;
        startGameModal.classList.add("deactivated");
    }

    startGameButton.onclick = startGame;

    function rotateCamera() {
        let radians = (camera.personal.degree * Math.PI)/180;
        let zMultiplier = Math.cos(radians);
        let xMultiplier = Math.sin(radians);
        camera.position.x = cameraDefaultPosition.z * xMultiplier + cameraDefaultPosition.x;
        camera.position.z = cameraDefaultPosition.z * zMultiplier;
        camera.rotation.y = radians;
    }

    function keydownEventHandler(e) {
        if (e.code === "ArrowUp") {
            tetris.rotateCurrentLeft();
        } else if (e.code === "ArrowRight") {
            tetris.translateCurrentRight();
        } else if (e.code === "ArrowLeft") {
            tetris.translateCurrentLeft();
        } else if (e.code === "ArrowDown") {
            tetris.translateCurrentDownOne();
        } else if (e.code === "Space") {
            tetris.dropTetromino();
        } else if (e.code === "KeyW" && camera.position.y < tetris.numRows) {
            camera.position.y += .5;
        } else if (e.code === "KeyS" && camera.position.y > 0) {
            camera.position.y -= .5;
        } else if (e.code === "KeyA" && camera.personal.degree > -45) {
            camera.personal.degree -= 1;
            rotateCamera();
        } else if (e.code === "KeyD" && camera.personal.degree < 45) {
            camera.personal.degree += 1;
            rotateCamera();
        }
    }

    addEventListener("keydown", keydownEventHandler)

    animate();
}

main();