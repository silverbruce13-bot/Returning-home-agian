
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Song, DailyReading } from "../types";
import { Language } from "../i18n";
import { formatReadingRef } from "../constants";

const getAiClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export interface StoryKeywords {
    positive: string[];
    sin: string[];
    hope: string[];
}

const getPrompts = (language: Language, reference: string, passage?: string, context?: string) => {
    const prompts = {
        ko: {
            comprehensiveReading: `성경 ${reference}의 포괄적인 묵상 자료를 생성해 주세요. 다음 JSON 스키마에 따라 응답을 생성해야 합니다.

요청 상세:
1.  **passage**: ${reference}의 전체 본문 (현대적인 한국어 번역, 각 절 번호 포함).
2.  **preReadingQuestions**: 본문을 읽기 전, 성도가 말씀의 핵심 의도를 파악하고 하나님 뜻의 중심을 잡을 수 있도록 돕는 5가지 프리리딩(Pre-reading) 질문. 각 질문의 끝(물음표 뒤)에, 그 질문에 대한 답이 될 수 있는 핵심 키워드 1~2개를 괄호() 안에 넣어주세요. (예: 이방인을 향한 하나님의 계획은 무엇인가요? (구원, 하나됨))
3.  **meditationGuide**: 본문에 기반한 묵상 가이드 ('**'로 제목을 구분하고, 각 항목은 줄바꿈으로 구분합니다. 형식: 핵심 메시지, 나를 위한 질문, 오늘의 적용, 마치는 기도).
4.  **context**: 본문의 역사적, 문화적 배경 (약 100 단어 내외).
5.  **intention**: 본문이 기록된 핵심 의도 (저자의 목적, 신학적 메시지, 기대하는 변화 등을 3-4 문단으로 설명).
6.  **imagePrompt**: '${reference}'의 핵심 주제를 상징적으로 나타내는 안전한 이미지 프롬프트. 사람, 종교적 인물, 갈등 요소를 제외하고 오직 사물, 자연, 빛만을 사용하여 사실적인 유화 스타일로 생성할 수 있는 프롬프트.
7.  **summary**: 본문의 핵심 내용을 2-3문장으로 요약한 간결한 요약문.`,
            comprehensiveReadingSchema: {
                passage: { type: Type.STRING, description: "성경 본문 전체. 각 절은 줄바꿈으로 구분해주세요." },
                preReadingQuestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "본문을 읽기 전에 묵상할 5가지 핵심 질문과 답이 될 수 있는 키워드(괄호 포함)." },
                meditationGuide: { type: Type.STRING, description: "묵상 가이드. '**'로 제목을 구분하고 각 항목은 줄바꿈으로 구분합니다." },
                context: { type: Type.STRING, description: "역사적, 문화적 배경 설명." },
                intention: { type: Type.STRING, description: "본문이 기록된 핵심 의도 설명." },
                imagePrompt: { type: Type.STRING, description: "성경의 주제를 상징하는 안전하고 시각적인 이미지 생성 프롬프트." },
                summary: { type: Type.STRING, description: "본문의 간결한 2-3문장 요약." }
            },
            evangelismTips: `당신은 지혜롭고 열정적인 전도자입니다. 다음 성경 본문의 핵심 메시지를 바탕으로, 믿지 않는 친구나 이웃에게 복음을 자연스럽고 사랑이 담긴 방식으로 전할 수 있는 방법을 제안해 주세요. 한국어로 작성해 주세요.

    다음 내용을 포함해 주세요:
    1.  **나눔을 위한 핵심 포인트**: 이 본문의 어떤 부분을 강조하며 이야기하면 좋을까요?
    2.  **대화 시작 아이디어**: 어떻게 자연스럽게 대화를 시작할 수 있을까요?
    3.  **대화 예시**: 짧은 대화 예시를 보여주세요.

    성경 본문:
    ${passage}`,
            evangelismTipsError: "전도 팁 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
            imageFallback: `고대 중동의 평화로운 풍경. 올리브 나무와 돌길이 있는 언덕의 사실적인 유화.`,
            recommendMusic: `분석할 글의 정서적 분위기에 가장 잘 어울리는 찬양(CCM 또는 찬송가) 3~5곡을 추천해 주세요.`,
            recommendMusicContextPrefix: `\n[분석할 글]\n${context}`,
            recommendMusicSchema: {
                songs: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            artist: { type: Type.STRING },
                        },
                        required: ["title", "artist"],
                    },
                },
            },
            prayerGuide: `다음 성경 본문을 바탕으로, A.C.T.S. 모델을 사용한 기도문을 작성해 주세요. 한국어로 작성해 주세요.\n\n성경 본문:\n${passage}`,
            prayerGuideError: "기도문 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
            sermonOutline: `다음 성경 본문을 바탕으로, 명확하고 영감을 주는 설교 개요를 작성해 주세요. 한국어로 작성해 주세요.\n\n성경 본문:\n${passage}`,
            sermonOutlineError: "설교 개요 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
            storyKeywords: `성경 본문에서 가장 중심이 되는 말씀 키워드를 추출하여 세 가지 카테고리(positive, sin, hope)로 분류해 주세요.\n\n성경 본문:\n${passage}`,
            storyKeywordsSchema: {
                positive: { type: Type.ARRAY, items: { type: Type.STRING } },
                sin: { type: Type.ARRAY, items: { type: Type.STRING } },
                hope: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            explainSelection: `당신은 깊은 영적 통찰을 가진 신학자입니다. 다음 성경 본문 전체의 맥락 안에서 사용자가 선택한 구절에 대해 깊이 있는 해설을 제공해주세요.\n\n[본문 전체]\n${context}\n\n[선택한 구절]\n${passage}`,
            explainSelectionError: "구절 해설 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        },
        en: {
            comprehensiveReading: `Generate comprehensive meditation material for ${reference} in English. Respond in JSON.`,
            comprehensiveReadingSchema: {
                passage: { type: Type.STRING },
                preReadingQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                meditationGuide: { type: Type.STRING },
                context: { type: Type.STRING },
                intention: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
                summary: { type: Type.STRING }
            },
            evangelismTips: `Suggest ways to share the gospel based on this Bible passage in English:\n${passage}`,
            evangelismTipsError: "Failed to generate evangelism tips.",
            imageFallback: `A peaceful biblical landscape. Realistic oil painting.`,
            recommendMusic: `Recommend 3-5 fitting praise songs for this context.`,
            recommendMusicContextPrefix: `\n[Context]\n${context}`,
            recommendMusicSchema: {
                songs: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            artist: { type: Type.STRING },
                        },
                        required: ["title", "artist"],
                    },
                },
            },
            prayerGuide: `Write a prayer guide using the A.C.T.S. model for this passage:\n${passage}`,
            prayerGuideError: "Failed to generate prayer guide.",
            sermonOutline: `Write a sermon outline for this passage:\n${passage}`,
            sermonOutlineError: "Failed to generate sermon outline.",
            storyKeywords: `Extract core keywords from this passage into positive, sin, hope categories:\n${passage}`,
            storyKeywordsSchema: {
                positive: { type: Type.ARRAY, items: { type: Type.STRING } },
                sin: { type: Type.ARRAY, items: { type: Type.STRING } },
                hope: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            explainSelection: `Provide deep theological explanation for selected verse within its context.\n\n[Full Context]\n${context}\n\n[Selected Verse]\n${passage}`,
            explainSelectionError: "Failed to generate verse explanation.",
        }
    };
    return prompts[language];
};

export async function generateComprehensiveReadingContent(reading: DailyReading, language: Language) {
  const ai = getAiClient();
  const reference = formatReadingRef(reading, language);
  const p = getPrompts(language, reference);
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: p.comprehensiveReading,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: p.comprehensiveReadingSchema,
        required: ["passage", "preReadingQuestions", "meditationGuide", "context", "intention", "imagePrompt", "summary"]
      },
      thinkingConfig: { thinkingBudget: 4096 }
    }
  });
  return JSON.parse(response.text);
}

export async function generateEvangelismTips(passage: string, language: Language) {
  const ai = getAiClient();
  const p = getPrompts(language, '', passage);
  const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: p.evangelismTips,
  });
  return response.text;
}

export async function generateContextImage({ initialPrompt, fallbackContext, language }: { initialPrompt: string, fallbackContext: string, language: Language }) {
  const ai = getAiClient();
  const detailedPrompt = (language === 'en' ? "A realistic symbolic oil painting of: " : "상징적인 유화 스타일: ") + initialPrompt;
  // Fix: Corrected contents format and removed responseModalities for image generation
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: detailedPrompt,
    config: {
        imageConfig: {
            aspectRatio: "1:1"
        }
    }
  });
  const imagePart = response.candidates?.[0]?.content?.parts?.find(part => part.inlineData);
  return imagePart?.inlineData ? `data:image/png;base64,${imagePart.inlineData.data}` : null;
}

export async function recommendMusic(context: string, language: Language) {
  const ai = getAiClient();
  const p = getPrompts(language, '', undefined, context);
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts: [{ text: p.recommendMusic }, { text: p.recommendMusicContextPrefix }] },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: p.recommendMusicSchema,
        required: ["songs"],
      },
    },
  });
  return JSON.parse(response.text).songs || [];
}

export async function generatePrayerGuide(passage: string, language: Language) {
  const ai = getAiClient();
  const p = getPrompts(language, '', passage);
  const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: p.prayerGuide,
  });
  return response.text;
}

export async function generateSermonOutline(passage: string, language: Language) {
  const ai = getAiClient();
  const p = getPrompts(language, '', passage);
  const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: p.sermonOutline,
  });
  return response.text;
}

export async function generateStoryKeywords(passage: string, language: Language) {
  const ai = getAiClient();
  const p = getPrompts(language, '', passage);
  const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: p.storyKeywords,
      config: {
          responseMimeType: "application/json",
          responseSchema: {
              type: Type.OBJECT,
              properties: p.storyKeywordsSchema,
              required: ["positive", "sin", "hope"]
          }
      }
  });
  return JSON.parse(response.text);
}

export async function explainPassageSelection(selectedText: string, passageContext: string, language: Language) {
  const ai = getAiClient();
  const p = getPrompts(language, '', selectedText, passageContext);
  const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: p.explainSelection,
  });
  return response.text;
}
