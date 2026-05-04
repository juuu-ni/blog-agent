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
 * -- 공개 접근 허용 (Row Level Security 비활성화 또는 아래 정책 사용)
 * alter table saved_posts enable row level security;
 *
 * create policy "allow all" on saved_posts
 *   for all using (true) with check (true);
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
 * alter table style_profiles enable row level security;
 *
 * create policy "allow all" on style_profiles
 *   for all using (true) with check (true);
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[supabase] SUPABASE_URL 또는 SUPABASE_ANON_KEY가 설정되지 않았습니다.');
}

const supabase = createClient(supabaseUrl || '', supabaseKey || '');

export default supabase;
