import Image from "next/image";
import Link from "next/link";
import { alexandria } from "@/app/fonts";
import hero from "../../public/hero-img.png";

const highlights = ["خامات فاخرة", "تفاصيل أنيقة", "التوصيل إلى 69 ولاية"];

const featureCards = [
  {
    label: "الطابع",
    value: "أناقة عصرية بلمسة تقليدية",
  },
  {
    label: "الاختيار",
    value: "قطع مختارة للمناسبات والإطلالات اليومية",
  },
];

export default function Hero() {
  return (
    <section
      className={`${alexandria.className} flex justify-center overflow-hidden  mt-0 md:mt-10`}>
      <div className="order-2 flex w-full max-w-6xl flex-col items-center justify-center gap-8 px-6 py-10 text-right sm:w-full lg:order-1 lg:px-16 lg:py-16">
        <div className="space-y-6" dir="rtl">
          <h1 className="w-full text-4xl font-semibold text-center leading-[1.08] tracking-tight text-caftan-text sm:text-6xl lg:text-7xl">
            قفاطين مصممة لتمنحك حضورًا راقيًا في كل مناسبة
          </h1>
          <p className="w-full text-center text-sm mt-[40px] leading-8  text-caftan-brand-dark sm:text-lg sm:w-full">
            اكتشفي تصاميم تجمع بين الحرفة الراقية واللمسة الحديثة، بأقمشة مختارة
            وتفاصيل تمنح كل إطلالة شخصية ناعمة وفاخرة.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-4 w-full sm:flex-row-reverse sm:items-center sm:gap-6">
          <Link
            href="/products"
            className="rounded-xs border border-caftan-brand bg-caftan-brand px-7 py-3 text-lg font-medium text-caftan-surface transition-colors duration-300 hover:bg-caftan-brand-dark">
            اكتشفي المجموعة
          </Link>
          <p
            className="max-w-sm text-sm leading-7 text-caftan-brand-dark sm:text-base"
            dir="rtl">
            قطع مميزة بلمسة أنثوية هادئة وفاخرة
          </p>
        </div>
      </div>
    </section>
  );
}
