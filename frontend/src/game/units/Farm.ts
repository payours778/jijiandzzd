import { Unit } from "../Unit";

export class Farm extends Unit {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    row: number,
    col: number,
  ) {
    super(scene, x, y, "农", { color: "#16a34a" }, row, col, 80);
  }
}
