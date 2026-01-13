package logger

import (
	"context"
	"errors"
	"fmt"
	"time"

	"go.uber.org/zap"
	"gorm.io/gorm/logger"
)

// GormLogger GORM 日志适配器
type GormLogger struct {
	ZapLogger                 *zap.Logger
	LogLevel                  logger.LogLevel
	SlowThreshold             time.Duration
	IgnoreRecordNotFoundError bool
}

// NewGormLogger 创建 GORM 日志适配器
func NewGormLogger(logLevel logger.LogLevel, slowThreshold time.Duration) *GormLogger {
	return &GormLogger{
		ZapLogger:                 GetLogger(),
		LogLevel:                  logLevel,
		SlowThreshold:             slowThreshold,
		IgnoreRecordNotFoundError: false,
	}
}

// LogMode 设置日志级别
func (l *GormLogger) LogMode(level logger.LogLevel) logger.Interface {
	newLogger := *l
	newLogger.LogLevel = level
	return &newLogger
}

// Info 记录 Info 级别日志
func (l *GormLogger) Info(ctx context.Context, msg string, data ...interface{}) {
	if l.LogLevel >= logger.Info {
		l.ZapLogger.Info(fmt.Sprintf(msg, data...))
	}
}

// Warn 记录 Warn 级别日志
func (l *GormLogger) Warn(ctx context.Context, msg string, data ...interface{}) {
	if l.LogLevel >= logger.Warn {
		l.ZapLogger.Warn(fmt.Sprintf(msg, data...))
	}
}

// Error 记录 Error 级别日志
func (l *GormLogger) Error(ctx context.Context, msg string, data ...interface{}) {
	if l.LogLevel >= logger.Error {
		l.ZapLogger.Error(fmt.Sprintf(msg, data...))
	}
}

// Trace 记录 Trace 级别日志（SQL 查询）
func (l *GormLogger) Trace(ctx context.Context, begin time.Time, fc func() (string, int64), err error) {
	if l.LogLevel <= logger.Silent {
		return
	}

	elapsed := time.Since(begin)
	sql, rows := fc()

	switch {
	case err != nil && l.LogLevel >= logger.Error && (!errors.Is(err, logger.ErrRecordNotFound) || !l.IgnoreRecordNotFoundError):
		l.ZapLogger.Error("SQL Error",
			zap.Error(err),
			zap.String("sql", sql),
			zap.Int64("rows", rows),
			zap.Duration("elapsed", elapsed),
		)
	case elapsed > l.SlowThreshold && l.SlowThreshold != 0 && l.LogLevel >= logger.Warn:
		l.ZapLogger.Warn("Slow SQL",
			zap.String("sql", sql),
			zap.Int64("rows", rows),
			zap.Duration("elapsed", elapsed),
		)
	case l.LogLevel == logger.Info:
		l.ZapLogger.Info("SQL",
			zap.String("sql", sql),
			zap.Int64("rows", rows),
			zap.Duration("elapsed", elapsed),
		)
	}
}
