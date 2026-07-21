import {
  createContext,
  useContext,
  useState,
} from "react";

const ShiftContext = createContext(null);

export function ShiftProvider({ children }) {
  const [period, setPeriod] = useState(null);
  const [shifts, setShifts] = useState([]);

  return (
    <ShiftContext.Provider
      value={{
        period,
        setPeriod,
        shifts,
        setShifts,
      }}
    >
      {children}
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