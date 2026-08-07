import { useEffect } from "react";
import { useBlocker } from "react-router-dom";

const WARNING_MESSAGE =
  "画面を切り替えますか？\n（編集中の内容は破棄されます）";

function useUnsavedChanges(hasUnsavedChanges) {
  const blocker = useBlocker(hasUnsavedChanges);

  useEffect(() => {
    if (blocker.state !== "blocked") {
      return;
    }

    if (window.confirm(WARNING_MESSAGE)) {
      blocker.proceed();
    } else {
      blocker.reset();
    }
  }, [blocker]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChanges) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);
}

export default useUnsavedChanges;
