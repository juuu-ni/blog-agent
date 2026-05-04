import { Router } from 'express';
import supabase from '../lib/supabase.js';

const router = Router();

// GET /api/profiles — 본인 프로파일 목록
router.get('/', async (req, res) => {
  const userId = req.session.user.id;

  const { data, error } = await supabase
    .from('style_profiles')
    .select('id, name, profile, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[profiles] select error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// POST /api/profiles — 프로파일 저장 (이름 중복 시 덮어쓰기)
router.post('/', async (req, res) => {
  const { name, profile } = req.body;
  if (!name || !profile) {
    return res.status(400).json({ error: '이름과 프로파일이 필요합니다.' });
  }

  const userId = req.session.user.id;

  // 같은 이름 기존 항목 삭제 후 새로 insert (upsert 대신 단순화)
  await supabase
    .from('style_profiles')
    .delete()
    .eq('user_id', userId)
    .eq('name', name);

  const { data, error } = await supabase
    .from('style_profiles')
    .insert({ user_id: userId, name, profile })
    .select('id, name, profile, created_at')
    .single();

  if (error) {
    console.error('[profiles] insert error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// PUT /api/profiles/:id — 프로파일 수정
router.put('/:id', async (req, res) => {
  const { name, profile } = req.body;
  if (!name || !profile) {
    return res.status(400).json({ error: '이름과 프로파일이 필요합니다.' });
  }

  const userId = req.session.user.id;

  const { data, error } = await supabase
    .from('style_profiles')
    .update({ name, profile })
    .eq('id', req.params.id)
    .eq('user_id', userId)
    .select('id, name, profile, created_at')
    .single();

  if (error) {
    console.error('[profiles] update error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// DELETE /api/profiles/:id — 프로파일 삭제
router.delete('/:id', async (req, res) => {
  const userId = req.session.user.id;

  const { error } = await supabase
    .from('style_profiles')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', userId);

  if (error) {
    console.error('[profiles] delete error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true });
});

export default router;
