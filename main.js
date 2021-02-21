document.getElementById('parent').addEventListener('contextmenu', e=>e.preventDefault());
document.getElementById('change').addEventListener('click', e=>{
  size = parseInt(document.getElementById('res').value);
  setup();
});
document.getElementById('time').addEventListener('input', e=> tick = parseFloat(e.target.value));
document.querySelectorAll('input[name="interpolation"]').forEach(x=>x.addEventListener('change', e=>{
  if(e.target.id == "no-interpolation"){
     useLinear = false;
     document.getElementById('draw').disabled = false;
  }else if(e.target.id == "linear-interpolation"){
    document.getElementById('draw').disabled = true;
    drawing = false;
    useLinear = true;
  }
}));
document.querySelectorAll('input[name="points"]').forEach(x=>x.addEventListener('change', e=>{
  if(e.target.id == "none"){
    displaypoints = 0;
  }else if(e.target.id == "in-bounds"){
    displaypoints = 1;
  }else if(e.target.id == "field"){
    displaypoints = 2;
  }
}));
document.querySelectorAll('input[name="mode"]').forEach(x=>x.addEventListener('change', e=>{
  if(e.target.id == "animate"){
    document.getElementById('linear-interpolation').disabled = false;
    drawing = false;
    mode = 0;
  }else if(e.target.id == "stop"){
    mode = 1;
  }else if(e.target.id == "draw"){
    useLinear = false;
    drawing = true;
    document.getElementById('linear-interpolation').disabled = true;
    grid.forEach((row,i) => row.forEach((x, j) =>{
      if(i == 0 || i == H + 1 || j == 0 || j == W + 1){
        grid[i][j] = 0.5;
      }else{
        grid[i][j] = 0;
      }
    }));
  }
}));

let drawing = false;
let useLinear = false;
let mode = 0;
let displaypoints = 0;

let size = 30;
let W, H;
let grid;
let noise_precalc;

let time = 0;
let tick = 0.005;

const log2 = [0, 0, 1, 1, 2, 2, 2, 2, 3];
const rule = [
  [0],
  [9],
  [3],
  [10],
  [6],
  [3, 12],
  [5],
  [12],
  [12],
  [5],
  [9, 6],
  [6],
  [10],
  [3],
  [9],
  [0]
];

let first = true;
let openSimplex;


function setup() {
  if(first){
    let C = createCanvas(600, 600);
    C.parent("parent");
    first = false;
    openSimplex = openSimplexNoise(random(42))
  }
  W = Math.ceil(width / size);
  H = Math.ceil(height / size );
  grid = (new Array(H+2).fill(0)).map(x=>(new Array(W+2)).fill(0));
  noise_precalc = (new Array(H+2).fill(0)).map(x=>(new Array(W+2)).fill(0).map(x=>[0,0]));
  noise_precalc.forEach((row,i) => row.forEach((x, j) =>{
    if(i == 0 || i == H + 1 || j == 0 || j == W + 1){
      noise_precalc[i][j][0] = 0;
      noise_precalc[i][j][1] = 0;
    }else{
      noise_precalc[i][j][0] = (i/H) * 7;
      noise_precalc[i][j][1] = (j/W) * 7;
    }
  }));
}

function draw() {
  if(!drawing){
    grid.forEach((row,i) => row.forEach((x, j) =>{
      if(i == 0 || i == H + 1 || j == 0 || j == W + 1){
        grid[i][j] = 0.5;
      }else{
        grid[i][j] = (openSimplex.noise3D(noise_precalc[i][j][0], noise_precalc[i][j][1], time)+1)/2;
      }
    }));
    if(mode != 1)
      time+=tick;
  }else{
    if(mouseIsPressed){
      const x = floor(mouseX/size + 1);
      const y = floor(mouseY/size + 1);
      if(x > 0 && x < W && y > 0 && y < H){
        if(mouseButton == LEFT)
          grid[y][x] = 1;
        else if(mouseButton == RIGHT)
          grid[y][x] = 0;
      }
    }
  }
  background(25);
  stroke(255);
  for(let i = 0; i <= H; i++){
    for(let j = 0; j <= W; j++){

      if(displaypoints == 1 && grid[i][j] > 0.5){
        point(j*size - size/2, i*size - size/2);
      }else if(displaypoints == 2){
        strokeWeight(size*grid[i][j]);
        stroke(100);
        point(j*size - size/2, i*size - size/2);
        stroke(255);
      }

      const num = (grid[i][j]>0.5) + 2*(grid[i+1][j]>0.5) + 4*(grid[i+1][j+1]>0.5) + 8*(grid[i][j+1]>0.5);

      if(num == 0 || num == 15) continue;

      for(let r of rule[num]){
        const first = Math.max(...[r&1, r&2, r&4, r&8]);
        const second = r-first;
        let [ax, ay, bx, by] = get_points(first, second, i, j);
        strokeWeight(1);
        line(
          j*size -size/2 + ax,
          i*size -size/2 + ay,
          j*size -size/2 + bx,
          i*size -size/2 + by,
        );


      }

    }
  }
}

const dx = [0,0,1,1];
const dy = [0,1,1,0];
function get_points(first, second, i, j){

  const a1 = log2[first];
  const a2 = (log2[first]+1)&0b11;
  const b1 = log2[second];
  const b2 = (log2[second]+1)&0b11;

  let ax, ay, bx, by;

  if(useLinear){
    if((a1>>1)==(a2>>1)){ // point a is on a vertical line
      ax = (a1>>1) * size;
      if(dy[a1] > dy[a2]){
        ay = size * (grid[i+dy[a1]][j+dx[a1]]/(grid[i+dy[a2]][j+dx[a2]]+grid[i+dy[a1]][j+dx[a1]]));
      }else{
        ay = size * (grid[i+dy[a2]][j+dx[a2]]/(grid[i+dy[a2]][j+dx[a2]]+grid[i+dy[a1]][j+dx[a1]]));
      }
    }else{ // point a is on a horizontal line
      ay = (a1*a2*0.5) * size;
      if(dx[a1] > dx[a2]){
        ax = size * (grid[i+dy[a2]][j+dx[a2]]/(grid[i+dy[a1]][j+dx[a1]]+grid[i+dy[a2]][j+dx[a2]]));
      }else{
        ax = size * (grid[i+dy[a1]][j+dx[a1]]/(grid[i+dy[a1]][j+dx[a1]]+grid[i+dy[a2]][j+dx[a2]]));
      }
    }

    if((b1>>1)==(b2>>1)){ // point a is on a vertical line
      bx = (b1>>1) * size;
      if(dy[b1] < dy[b2]){
        by = size * (grid[i+dy[b2]][j+dx[b2]]/(grid[i+dy[b2]][j+dx[b2]]+grid[i+dy[b1]][j+dx[b1]]));
      }else{
        by = size * (grid[i+dy[b1]][j+dx[b1]]/(grid[i+dy[b2]][j+dx[b2]]+grid[i+dy[b1]][j+dx[b1]]));
      }
    }else{ // point a is on a horizontal line
      by = (b1*b2*0.5) * size;
      if(dx[b1]<dx[b2]){
        bx = size * (grid[i+dy[b1]][j+dx[b1]]/(grid[i+dy[b1]][j+dx[b1]]+grid[i+dy[b2]][j+dx[b2]]));
      }else{
        bx = size * (grid[i+dy[b2]][j+dx[b2]]/(grid[i+dy[b1]][j+dx[b1]]+grid[i+dy[b2]][j+dx[b2]]));
      }
    }

  }else{
    if((a1>>1)==(a2>>1)){ // point a is on a vertical line
      ax = (a1>>1) * size;
      ay = size/2;
    }else{ // point a is on a horizontal line
      ay = (a1*a2*0.5) * size;
      ax = size/2;
    }

    if((b1>>1)==(b2>>1)){ // point a is on a vertical line
      bx = (b1>>1) * size;
      by = size/2;
    }else{ // point a is on a horizontal line
      by = (b1*b2*0.5) * size;
      bx = size/2;
    }
  }

  return [ax, ay, bx, by];
}
