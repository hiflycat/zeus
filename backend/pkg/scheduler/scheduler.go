package scheduler

import (
	"sync"
	"time"

	"backend/pkg/logger"

	"go.uber.org/zap"
)

// Job 定时任务接口
type Job interface {
	Name() string
	Run()
}

// Scheduler 定时任务调度器
type Scheduler struct {
	jobs     []jobEntry
	stopCh   chan struct{}
	wg       sync.WaitGroup
	mu       sync.Mutex
	running  bool
}

type jobEntry struct {
	job      Job
	interval time.Duration
}

// New 创建调度器
func New() *Scheduler {
	return &Scheduler{
		stopCh: make(chan struct{}),
	}
}

// Register 注册定时任务
func (s *Scheduler) Register(job Job, interval time.Duration) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.jobs = append(s.jobs, jobEntry{job: job, interval: interval})
}

// Start 启动调度器
func (s *Scheduler) Start() {
	s.mu.Lock()
	if s.running {
		s.mu.Unlock()
		return
	}
	s.running = true
	s.mu.Unlock()

	for _, entry := range s.jobs {
		s.wg.Add(1)
		go s.runJob(entry)
	}
	logger.Info("Scheduler started", zap.Int("jobs", len(s.jobs)))
}

// Stop 停止调度器
func (s *Scheduler) Stop() {
	s.mu.Lock()
	if !s.running {
		s.mu.Unlock()
		return
	}
	s.running = false
	s.mu.Unlock()

	close(s.stopCh)
	s.wg.Wait()
	logger.Info("Scheduler stopped")
}

func (s *Scheduler) runJob(entry jobEntry) {
	defer s.wg.Done()

	ticker := time.NewTicker(entry.interval)
	defer ticker.Stop()

	// 启动时先执行一次
	s.safeRun(entry.job)

	for {
		select {
		case <-ticker.C:
			s.safeRun(entry.job)
		case <-s.stopCh:
			return
		}
	}
}

func (s *Scheduler) safeRun(job Job) {
	defer func() {
		if r := recover(); r != nil {
			logger.Error("Job panicked", zap.String("job", job.Name()), zap.Any("error", r))
		}
	}()
	job.Run()
}
