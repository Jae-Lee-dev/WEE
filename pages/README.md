이 폴더는 의도적으로 비어 있습니다.

Next.js는 App Router를 사용하더라도 src/pages가 존재하면 이를
Pages Router로 사용하려 시도하며, 그 결과 빌드가 깨집니다.
이 빈 pages/ 폴더는 Pages Router 탐지를 루트로 흡수시켜
src/pages(FSD pages layer)가 Pages Router로 오인되는 것을 막습니다.

삭제 금지.

참고: https://feature-sliced.design/docs/guides/tech/with-nextjs
