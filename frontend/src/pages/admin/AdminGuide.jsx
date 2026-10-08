import GuidePage from "../../components/GuidePage";
import registrationRequestImage from "../../assets/admin/registration-request.png";
import shiftCalendarCompletedImage from "../../assets/admin/shift-calendar-completed.png";
import shiftCalendarEmptyImage from "../../assets/admin/shift-calendar-empty.png";
import shiftDayEditImage from "../../assets/admin/shift-day-edit.png";
import shiftPeriodBusinessDaysImage from "../../assets/admin/shift-period-business-days.png";
import shiftPeriodFormImage from "../../assets/admin/shift-period-form.png";
import staffListImage from "../../assets/admin/staff-list.png";

const sections = [
  {
    title: "シフト期間の設定",
    images: [
      {
        src: shiftPeriodFormImage,
        alt: "シフト期間画面を開き、開始日、終了日、営業日を設定する手順",
      },
      {
        src: shiftPeriodBusinessDaysImage,
        alt: "営業日を確認してシフト期間を保存する手順",
      },
    ],
    steps: [
      "下部メニューの「シフト期間」を開きます。",
      "開始日と終了日を入力します。",
      "必要に応じて営業日を変更します。",
      "内容を確認して保存します。",
    ],
  },
  {
    title: "シフト作成",
    images: [
      {
        src: shiftCalendarEmptyImage,
        alt: "シフト編集画面を開き、スタッフの希望を反映する手順",
      },
      {
        src: shiftDayEditImage,
        alt: "営業日のスタッフと備考を編集する手順",
      },
      {
        src: shiftCalendarCompletedImage,
        alt: "作成した確定シフトを確認して登録する手順",
      },
    ],
    steps: [
      "下部メニューの「シフト編集」を開きます。",
      "「希望を反映」を押して、スタッフの希望をシフトへ反映します。",
      "営業日を選び、出勤するスタッフと備考を設定します。",
      "内容を確認して登録します。",
    ],
  },
  {
    title: "スタッフ管理・登録許可",
    images: [
      {
        src: staffListImage,
        alt: "登録済みスタッフを確認して削除する手順",
      },
      {
        src: registrationRequestImage,
        alt: "新規登録申請を承認または却下する手順",
      },
    ],
    steps: [
      "「その他」から「スタッフ管理」または「登録申請」を開きます。",
      "スタッフ管理では登録済みスタッフを確認・削除できます。",
      "登録申請では申請内容を確認し、承認または却下します。",
    ],
  },
];

function AdminGuide() {
  return (
    <GuidePage
      backTo="/admin/others"
      sections={sections}
    />
  );
}

export default AdminGuide;
