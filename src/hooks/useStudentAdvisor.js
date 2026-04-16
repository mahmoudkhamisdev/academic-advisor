import { useState, useEffect } from "react";
import {
  firstYearCourses,
  secondYearCourses,
  thirdYearCourses,
  fourthYearCourses,
} from "@/utils/coursesData";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey:
    "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",
  dangerouslyAllowBrowser: true,
});

export function useStudentAdvisor() {
  const [step, setStep] = useState(1);
  const [gpa, setGpa] = useState("");
  const [advice, setAdvice] = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [level, setLevel] = useState("");
  const [department, setDepartment] = useState("");
  const [term, setTerm] = useState("");
  const [lang, setLang] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    setSelected([]);
  }, [term]);

  useEffect(() => {
    setTotalCredits(
      selected?.reduce((sum, item) => sum + (item.credits || 0), 0),
    );
  }, [selected]);

  useEffect(() => {
    setCredits(gpa < 2 ? 12 : 18);
  }, [gpa]);

  const courses = () => {
    let items = [];
    let year;

    switch (level) {
      case "first":
        year = firstYearCourses;
        break;
      case "second":
        year = secondYearCourses;
        break;
      case "third":
        year = thirdYearCourses.filter(
          (data) => data.department === department,
        );
        break;
      case "fourth":
        year = fourthYearCourses.filter(
          (data) => data.department === department,
        );
        break;
      default:
        year = [];
        break;
    }

    if (term === "first") {
      items = year.filter((data) => data.term === "term1");
    } else if (term === "second") {
      items = year.filter((data) => data.term === "term2");
    }

    return items;
  };

  const handleSubmit = async (e) => {
    let prompt;

    e.preventDefault();
    setLoading(true);

    const coursesDetails = courses().map((course) => {
      const prerequisitesNames =
        course.prerequisites.length > 0
          ? course.prerequisites
              .map(
                (code) =>
                  firstYearCourses.find((data) => data.courseCode === code)
                    ?.nameAr ||
                  secondYearCourses.find((data) => data.courseCode === code)
                    ?.nameAr ||
                  thirdYearCourses.find((data) => data.courseCode === code)
                    ?.nameAr ||
                  fourthYearCourses.find((data) => data.courseCode === code)
                    ?.nameAr,
              )
              .join(", ")
          : "لا يوجد";

      return `${course.nameAr} (${course.name}) - ساعات معتمدة: ${course.credits}, المتطلبات المسبقة: ${prerequisitesNames}`;
    });

    prompt = `
        أنت مرشد أكاديمي لطلاب في الجامعة. طالب حاصل على GPA بقيمة ${gpa} يرغب في التسجيل في المواد التالية:

        ${selected.map((data) => data.name)}

        ${completed.length > 0 ? "هذه هي تفاصيل جميع المواد التي اجتازها:" : ""}
        ${completed.map((data) => data.name)}

        هذه هي تفاصيل جميع المواد المتاحة:
        
        ${coursesDetails}

        ويجب ان يكون عدد الساعات الكلي للمواد المختارة ليس اكبر من ${credits}.

        بناءً على هذه المعلومات، يرجى تقديم النصيحة بشأن:
        1. ما هي متطلبات كل مادة تم اختيارها.
        2. ما إذا كان الطالب يمكنه التسجيل في جميع المواد المطلوبة.
        3. إذا كان لا يمكنه التسجيل في بعض المواد، أي المواد يمكنه تسجيلها ولماذا.
        4. اقتراحات للمواد البديلة إذا كانت بعض المواد غير متاحة أو غير مناسبة.
        5. أي نصائح أكاديمية أخرى بناءً على معدله التراكمي واختياره للمواد.

        يرجى تقديم الإجابة باللغة العربية وبشكل واضح ومختصر
        `;

    try {
      const completion = await openai.chat.completions.create({
        model: "liquid/lfm-2.5-1.2b-instruct:free",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });
      setAdvice(completion.choices[0].message?.content);
    } catch (error) {
      console.error("Error generating advice:", error);
      setAdvice("حدث خطأ أثناء الحصول على النصيحة. يرجى المحاولة مرة أخرى.");
    }

    setLoading(false);
    setStep(5);
    setProgress((prev) => prev + 0.4);
  };

  return {
    step,
    setStep,
    gpa,
    setGpa,
    advice,
    loading,
    selected,
    setSelected,
    completed,
    setCompleted,
    level,
    setLevel,
    department,
    setDepartment,
    term,
    setTerm,
    lang,
    setLang,
    progress,
    setProgress,
    totalCredits,
    credits,
    courses,
    handleSubmit,
  };
}
