// 실제 기업형 프로젝트에서는 `ng generate environments`로
// environment.ts(개발용) / environment.production.ts(배포용) 두 파일을 만들고
// angular.json의 fileReplacements 설정으로 빌드 시 자동 교체합니다.
// 이 저장소는 학습용으로 파일 하나만 두고, 값만 예시로 구성합니다.
export const environment = {
  production: false,
  apiBaseUrl: 'https://jsonplaceholder.typicode.com',
};
