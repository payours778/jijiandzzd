import { Unit } from "../Unit";

export class GeneralFragment extends Unit {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    row: number,
    col: number,
    text: string,
  ) {
    super(scene, x, y, text, { color: "#9333ea" }, row, col, 60);
  }
}
