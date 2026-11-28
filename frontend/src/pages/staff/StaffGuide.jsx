import GuidePage from "../../components/GuidePage";
import requestMenuImage from "../../assets/staff/IMG_7996_menu.jpg";
import requestPeriodImage from "../../assets/staff/IMG_7996_period.jpg";
import requestSubmitImage from "../../assets/staff/IMG_8002_marked.jpg";
import shiftMenuImage from "../../assets/staff/IMG_7995.jpg";
import shiftPeriodSelectImage from "../../assets/staff/IMG_8003_marked.jpg";
import shiftCalendarImage from "../../assets/staff/IMG_8004_marked.jpg";

const sections = [
  {
    title: "シフト希望の提出",
    steps: [
      {
        text: "下部メニューの「希望提出」を開きます。",
        images: [
          {
            src: requestMenuImage,
            alt: "下部メニューで「希望提出」を選んだ状態",
          },
        ],
      },
      {
        text: "「シフト期間」から対象の期間を選びます。",
        images: [
          {
            src: requestPeriodImage,
            alt: "シフト希望画面でシフト期間を選ぶ画面",
          },
        ],
      },
      {
        text: "出勤できる日を選び、必要に応じて備考を入力します。",
      },
      {
        text: "選択内容を確認して提出します。",
        images: [
          {
            src: requestSubmitImage,
            alt: "出勤できる日にチェックを入れて備考を入力し、「希望を登録」を押す画面",
          },
        ],
      },
    ],
  },
  {
    title: "シフトの確認",
    steps: [
      {
        text: "下部メニューの「シフト」を開きます。",
        images: [
          {
            src: shiftMenuImage,
            alt: "下部メニューで「シフト」を選んだ状態",
          },
        ],
      },
      {
        text: "「シフト期間」から対象の期間を選びます。",
        images: [
          {
            src: shiftPeriodSelectImage,
            alt: "確定シフト画面でシフト期間を選ぶ画面",
          },
        ],
      },
      {
        text: "日付ごとに出勤するスタッフと備考を確認します。",
        images: [
          {
            src: shiftCalendarImage,
            alt: "日付ごとに出勤するスタッフが表示されたカレンダー",
          },
        ],
      },
    ],
  },
];

function StaffGuide() {
  return (
    <GuidePage
      backTo="/staff/others"
      sections={sections}
    />
  );
}

export default StaffGuide;
