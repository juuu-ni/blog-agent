import { Router } from 'express';
import supabase from '../lib/supabase.js';

const router = Router();

// POST /api/posts — 글 저장
router.post('/', async (req, res) => {
  const { title, storeName, content, hashtags } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: '제목과 내용이 필요합니다.' });
  }

  const { data, error } = await supabase
    .from('saved_posts')
    .insert({ title, store_name: storeName || null, content, hashtags: hashtags || [] })
    .select('id, title, store_name, created_at')
    .single();

  if (error) {
    console.error('[posts] insert error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// GET /api/posts — 목록 조회 (content 제외로 응답 경량화)
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('saved_posts')
    .select('id, title, store_name, hashtags, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[posts] select error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// GET /api/posts/:id — 특정 글 전체 조회
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('saved_posts')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    console.error('[posts] select single error:', error);
    return res.status(status).json({ error: error.message });
  }
  res.json(data);
});

// DELETE /api/posts/:id — 글 삭제
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('saved_posts')
    .delete()
    .eq('id', req.params.id);

  if (error) {
    console.error('[posts] delete error:', error);
    return res.status(500).json({ error: error.message });
  }
  res.json({ success: true });
});

export default router;
