import api from "./authService";

export function getSpeechToTextConfig() {
  return api.get("/speech-to-text/config");
}
