import { GamePlayScene } from "./GamePlayScene";

export class FxTestScene extends GamePlayScene {
  constructor() {
    super("FxTestScene");
    this.testMode = true;
  }
}
