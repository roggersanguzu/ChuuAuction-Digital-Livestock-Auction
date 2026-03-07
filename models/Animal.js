import mongoose from "mongoose";
const animalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  imageUrl: { type: String, required: true },
});
const Animal = mongoose.model("Animal", animalSchema);
export default Animal;

