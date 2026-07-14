# ZIGSO (직소) 🧩

실시간 협동 학습(Jigsaw 모형)과 STAD(Student Teams-Achievement Divisions) 향상 점수 모델을 결합한 실시간 온라인 협동 학습 플랫폼입니다.

---

## 📌 프로젝트 개요

**ZIGSO**는 전통적인 Jigsaw 협동 학습 모형을 디지털 환경에 맞게 재해석하여 구현한 웹 애플리케이션입니다. 학생들은 특정 주제의 '전문가(Expert)' 역할을 배정받아 전문가 모둠에서 먼저 학습하고 문제풀이를 진행한 뒤, 원래의 '홈(Home) 모둠'으로 돌아가 서로가 배운 내용을 가르치고 배웁니다. 최종적으로 개별 퀴즈(실력 확인하기)를 수행하고, 개인의 향상도와 모둠의 기여도를 기반으로 협동적인 보상을 제공합니다.

---

## ✨ 주요 기능 (Core Features)

### 🧑‍🏫 교사 (Teacher) 기능
- **활동 에디터 (Activity Editor)**: 각 전문가 역할별 학습 자료(텍스트, 개념 설명) 및 연습 문제, 그리고 최종 평가용 개별 형성평가 문항을 제작/편집할 수 있습니다.
- **실시간 세션 관리**: 세션을 개설하고 QR 코드 및 입장 링크를 실시간으로 제공하여 학생들이 간편하게 접속하도록 돕습니다.
- **실시간 모둠 및 역할 배정**: 입장한 학생들의 인원수와 역할 비율을 계산하여 모둠(Home Group)과 역할(Expert Role)을 자동으로 무작위 배정합니다.
- **실시간 타이머 및 단계 전환**: 활동의 각 단계(개요 -> 전문가 -> 홈 모둠 -> 개별 퀴즈 -> 결과)를 교사가 실시간으로 원격 제어하고 타이머를 시작/일시정지/조정할 수 있습니다.
- **결과 대시보드 & 리포트**: 개인 순위, 모둠 순위 및 STAD 기준 향상도 분석, 학생 개별 분석 리포트를 실시간으로 제공합니다.

### 🧑‍🎓 학생 (Student) 기능
- **실시간 참가**: 로그인 과정 없이 닉네임과 입장 번호를 입력하거나 QR 코드를 스캔하여 신속하게 활동에 참여합니다.
- **1단계: 전문가 되기 (Expert Group)**: 본인에게 배정된 주제의 학습 내용을 공부하고, 전문가 연습 문제를 풀어 점수를 획득합니다. (최대 3회 제출 기회 제공, 시도 횟수에 따라 차등 점수 부여)
- **2단계: 서로 알려주기 (Home Group)**: 홈 모둠 화면에서 모둠원들의 얼굴 및 역할 현황을 확인하고, 각자 공부한 내용을 모둠원들에게 설명합니다.
- **3단계: 실력 확인하기 (Individual Quiz)**: 배운 내용을 바탕으로 전체 범위의 개별 형성평가를 수행합니다.
- **실시간 피드백 및 결과**: 최종 단계에서 개인 점수, 향상 점수, 모둠 기여도와 정답 해설을 즉시 확인합니다.

### 🧪 샌드박스 (Sandbox) 모드
- 가상의 학생들과 함께 교사 관점에서 전체 학습 흐름을 시뮬레이션하고 테스트해볼 수 있는 샌드박스 환경을 제공합니다.

---

## 🛠 기술 스택 (Tech Stack)

### Frontend
- **Framework**: React 19 (Vite 기반)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 (with PostCSS)
- **Icons & UI Effects**: Lucide React, Sonner
- **Routing**: React Router Dom v7

### Backend & Realtime
- **Database & Sync**: Supabase JS client
- **Realtime Service**: Supabase PostgreSQL Realtime (상태 동기화, Presence, Broadcast)
- **Authentication**: Supabase Auth (교사용 구글 간편 로그인 및 이메일 로그인 지원)

### State Management
- **Data Fetching**: TanStack Query (React Query v5)

---

## 📂 디렉토리 구조 (Directory Structure)

```text
ZIGSO/
├── public/                 # 정적 자원 (로고, 에셋 등)
├── scripts/                # 빌드 및 배포 보조 스크립트
├── src/
│   ├── components/         # 컴포넌트 폴더
│   │   ├── activity/       # 레이아웃 및 범용 활동 컴포넌트
│   │   ├── layout/         # 네비게이션 및 공통 프레임 레이아웃
│   │   ├── play/           # 학생 플레이 화면 및 단계별 패널 컴포넌트
│   │   ├── sandbox/        # 샌드박스(시뮬레이션) 전용 컴포넌트
│   │   ├── teacher/        # 에디터, 모둠 관리, 대시보드 등 교사용 컴포넌트
│   │   └── ui/             # 공통 UI 컴포넌트 (버튼, 다이얼로그, 카드 등)
│   ├── lib/                # 유틸리티 및 API 정의
│   │   ├── api/            # Supabase 연동 API (활동, 세션, 플레이 상태 등)
│   │   ├── activity-pack/  # 기본 탑재 활동 데이터 템플릿
│   │   ├── realtime/       # Supabase Realtime 채널 관리 및 구독 핸들러
│   │   ├── auth/           # 인증 관련 로직
│   │   └── types.ts        # 공통 타입 선언
│   ├── pages/              # 라우트 페이지 컴포넌트 (Home, Login, Play, Sessions 등)
│   ├── providers/          # 전역 컨텍스트 프로바이더 (React Query 등)
│   ├── App.tsx             # 라우팅 및 전역 상태 관리
│   ├── globals.css         # 글로벌 CSS 스타일 및 CSS 변수 테마 설정
│   └── main.tsx            # 애플리케이션 엔트리 포인트
├── .env                    # Supabase 환경 변수 설정 파일
├── package.json            # 의존성 모듈 및 스크립트 설정
├── tsconfig.json           # TypeScript 설정
└── vite.config.ts          # Vite 프로젝트 빌드 설정
```

---

## ⚙️ 시작하기 (Getting Started)

### 1. 필수 요구사항
- Node.js LTS 버전 (v18 이상 권장)
- npm 혹은 yarn 패키지 매니저

### 2. 환경 변수 설정
프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 다음 정보를 추가합니다:

```env
VITE_SUPABASE_URL="본인의 Supabase 프로젝트 URL"
VITE_SUPABASE_ANON_KEY="본인의 Supabase 익명 API 키"
```

### 3. 패키지 설치
```bash
npm install
```

### 4. 로컬 개발 서버 실행
```bash
npm run dev
```
기본적으로 `http://localhost:5173` 에서 개발 서버가 실행됩니다.

### 5. 프로덕션 빌드 및 미리보기
```bash
# 프로덕션 빌드
npm run build

# 로컬 미리보기
npm run start
```
