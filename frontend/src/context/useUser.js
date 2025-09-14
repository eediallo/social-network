import { useContext } from "react";
import { UserContext } from "./UserContext.jsx";

export function useUser() {
  return useContext(UserContext);
}

export default useUser;
