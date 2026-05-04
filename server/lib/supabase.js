/*
 * ── Supabase 테이블 생성 SQL ──
 * Supabase 대시보드 > SQL Editor 에서 아래 SQL을 실행하세요.
 *
 * create table saved_posts (
 *   id          uuid        primary key default gen_random_uuid(),
 *   user_id     text        not null,
 *   title       text        not null,
 *   store_name  text,
 *   content     jsonb,
 *   hashtags    text[],
 *   created_at  timestamptz default now()
 * );
 *
 * -- 기존 테이블에 user_id 컬럼 추가 (이미 테이블이 있는 경우)
 * alter table saved_posts add column if not exists user_id text;
 *
 * -- 서버(service_role 키)만 접근하므로 RLS는 비활성화 상태로 유지
 * -- (anon 키 사용 시 아래 정책으로 교체 필요)
 * alter table saved_posts disable row level security;
 *
 * -- 말투 프로파일 테이블
 * create table style_profiles (
 *   id          uuid        primary key default gen_random_uuid(),
 *   user_id     text        not null,
 *   name        text        not null,
 *   profile     jsonb       not null,
 *   created_at  timestamptz default now()
 * );
 *
 * alter table style_profiles disable row level security;
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[supabase] SUPABASE_URL 또는 SUPABASE_ANON_KEY가 설정되지 않았습니다.');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export default supabase;
