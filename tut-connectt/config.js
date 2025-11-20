import { Platform } from "react-native";

const API_URL =
    Platform.OS === "web"
        ? "http://localhost:3000"

        : "http://10.7.32.200:3000"







export default API_URL;
