package freshgate

import (
	"context"
	"log"
	"sync"
	"sync/atomic"
)

type AsyncVerificationJob struct {
	Payload VerifyPayload
	ID      string
}

type WorkerPool struct {
	jobsChan     chan AsyncVerificationJob
	client       *EngineClient
	workers      int
	queueCap     int
	wg           sync.WaitGroup
	quit         chan struct{}
	queuedCount  uint64
	droppedCount uint64
	successCount uint64
	failCount    uint64
}

func NewWorkerPool(workers int, queueCap int, client *EngineClient) *WorkerPool {
	if workers <= 0 {
		workers = 8
	}
	if queueCap <= 0 {
		queueCap = 256
	}

	p := &WorkerPool{
		jobsChan: make(chan AsyncVerificationJob, queueCap),
		client:   client,
		workers:  workers,
		queueCap: queueCap,
		quit:     make(chan struct{}),
	}

	for i := 0; i < workers; i++ {
		p.wg.Add(1)
		go p.workerLoop()
	}

	return p
}

func (p *WorkerPool) Enqueue(job AsyncVerificationJob) bool {
	select {
	case p.jobsChan <- job:
		atomic.AddUint64(&p.queuedCount, 1)
		return true
	default:
		// Queue full: drop oldest job to make room
		select {
		case <-p.jobsChan:
			atomic.AddUint64(&p.droppedCount, 1)
		default:
		}
		select {
		case p.jobsChan <- job:
			atomic.AddUint64(&p.queuedCount, 1)
			return true
		default:
			atomic.AddUint64(&p.droppedCount, 1)
			return false
		}
	}
}

func (p *WorkerPool) workerLoop() {
	defer p.wg.Done()
	defer func() {
		if r := recover(); r != nil {
			log.Printf("[freshgate] worker panic recovered: %v", r)
		}
	}()

	for {
		select {
		case <-p.quit:
			return
		case job, ok := <-p.jobsChan:
			if !ok {
				return
			}
			err := p.client.VerifyAsync(context.Background(), job.Payload)
			if err != nil {
				atomic.AddUint64(&p.failCount, 1)
			} else {
				atomic.AddUint64(&p.successCount, 1)
			}
		}
	}
}

func (p *WorkerPool) Stats() (queued uint64, dropped uint64, success uint64, failed uint64) {
	return atomic.LoadUint64(&p.queuedCount),
		atomic.LoadUint64(&p.droppedCount),
		atomic.LoadUint64(&p.successCount),
		atomic.LoadUint64(&p.failCount)
}

func (p *WorkerPool) Close() {
	close(p.quit)
	p.wg.Wait()
}
