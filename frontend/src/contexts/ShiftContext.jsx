import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { Outlet } from "react-router-dom";

const ShiftContext = createContext(null);

export function ShiftProvider() {
  useEffect(() => {
    console.log("ShiftProvider mounted");

    return () => {
      console.log("ShiftProvider unmounted");
    };
  }, []);
  const [shifts, setShifts] = useState([]);

  return (
    <ShiftContext.Provider
      value={{
        shifts,
        setShifts,
      }}
    >
      <Outlet />
    </ShiftContext.Provider>
  );
}

export function useShift() {
  const context = useContext(ShiftContext);

  if (!context) {
    throw new Error(
      "useShift must be used within ShiftProvider"
    );
  }

  return context;
}