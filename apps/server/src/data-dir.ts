import path from 'node:path';
/** Where the server keeps its state. On Render this is the mounted disk (see render.yaml); locally .data/. */
export function dataDir():string {return path.resolve(process.env.DATA_DIR??path.join(process.cwd(),'.data'));}
