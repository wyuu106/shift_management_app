import GuidePage from "../../components/GuidePage";
import confirmedShiftCalendarImage from "../../assets/staff/confirmed-shift-calendar.png";
import confirmedShiftDetailsImage from "../../assets/staff/confirmed-shift-details.png";
import shiftRequestFormImage from "../../assets/staff/shift-request-form.png";

const sections = [
  {
    title: "シフト希望の提出",
    images: [
      {
        src: shiftRequestFormImage,
        alt: "出勤可能日と備考を選択してシフト希望を提出する手順",
      },
    ],
    steps: [
      "下部メニューの「希望提出」を開きます。",
      "出勤できる日を選び、必要に応じて備考を入力します。",
      "選択内容を確認して提出します。",
    ],
  },
  {
    title: "シフトの確認",
    images: [
      {
        src: confirmedShiftCalendarImage,
        alt: "シフト画面を開く手順",
      },
      {
        src: confirmedShiftDetailsImage,
        alt: "日付ごとの出勤スタッフを確認する画面",
      },
    ],
    steps: [
      "下部メニューの「シフト」を開きます。",
      "日付ごとに出勤するスタッフと備考を確認します。",
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
