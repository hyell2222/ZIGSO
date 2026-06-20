/**
 * Supabase Auth 에러 메시지를 사용자 친화적인 한국어 메시지로 변환합니다.
 */
export function getKoreanAuthErrorMessage(error: unknown): string {
  if (!error) return "";

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);

  if (message.includes("Invalid login credentials")) {
    return "이메일 또는 비밀번호가 올바르지 않습니다.";
  }
  if (
    message.includes("Email not confirmed") ||
    message.includes("Email address not confirmed")
  ) {
    return "이메일 인증이 완료되지 않았습니다. 메일함을 확인해 주세요.";
  }
  if (
    message.includes("User already registered") ||
    message.includes("already registered") ||
    message.includes("User already exists")
  ) {
    return "이미 가입된 이메일 계정입니다.";
  }
  if (message.includes("Password should be at least")) {
    return "비밀번호는 최소 6자 이상이어야 합니다.";
  }
  if (message.includes("rate limit") || message.includes("Rate limit")) {
    return "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (message.includes("Invalid email") || message.includes("Signup requires a valid email")) {
    return "올바르지 않은 이메일 형식입니다.";
  }
  if (message.includes("Unable to validate email address")) {
    return "유효하지 않은 이메일 주소입니다.";
  }

  // 기본 오류 메시지
  return `로그인/회원가입에 실패했습니다. (${message})`;
}
