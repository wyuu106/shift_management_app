import GuidePage from "../../components/GuidePage";
import periodMenuImage from "../../assets/admin/IMG_7983.jpg";
import periodFormImage from "../../assets/admin/IMG_7985_marked.jpg";
import periodSaveImage from "../../assets/admin/IMG_7987_marked.jpg";
import shiftMenuImage from "../../assets/admin/IMG_7989_menu.jpg";
import shiftPeriodSelectImage from "../../assets/admin/IMG_7989_marked.jpg";
import shiftReflectImage from "../../assets/admin/IMG_7990_marked.jpg";
import shiftDayEditImage from "../../assets/admin/IMG_8006_marked.jpg";
import shiftCompletedImage from "../../assets/admin/IMG_7993_marked.jpg";

const sections = [
  {
    title: "シフト期間の設定",
    steps: [
      {
        text: "下部メニューの「シフト期間」を開きます。",
        images: [
          {
            src: periodMenuImage,
            alt: "下部メニューで「シフト期間」を選んだ状態",
          },
        ],
      },
      {
        text: "開始日と終了日を入力します。",
        images: [
          {
            src: periodFormImage,
            alt: "期間名、開始日、終了日を入力する画面",
          },
        ],
      },
      {
        text: "必要に応じて営業日を変更します。",
      },
      {
        text: "内容を確認して保存します。",
        images: [
          {
            src: periodSaveImage,
            alt: "営業日を確認して「この期間で保存」を押す画面",
          },
        ],
      },
    ],
  },
  {
    title: "シフト作成",
    steps: [
      {
        text: "下部メニューの「シフト編集」を開きます。",
        images: [
          {
            src: shiftMenuImage,
            alt: "下部メニューで「シフト編集」を選んだ状態",
          },
        ],
      },
      {
        text: "「シフト期間」から対象の期間を選びます。",
        images: [
          {
            src: shiftPeriodSelectImage,
            alt: "シフト編集画面でシフト期間を選ぶ画面",
          },
        ],
      },
      {
        text: "「希望を反映」を押して、スタッフの希望をシフトへ反映します。",
        images: [
          {
            src: shiftReflectImage,
            alt: "シフト編集画面の「希望を反映」ボタン",
          },
        ],
      },
      {
        text: "営業日を選び、出勤するスタッフと備考を設定します。",
        images: [
          {
            src: shiftDayEditImage,
            alt: "営業日を選び、出勤するスタッフと備考を設定する画面",
          },
        ],
      },
      {
        text: "内容を確認して登録します。",
        images: [
          {
            src: shiftCompletedImage,
            alt: "完成したシフトを確認して「シフトを登録」を押す画面",
          },
        ],
      },
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
