// YouTube Subtitle Performance Monitor & Analytics
class YouTubeSubtitleAnalytics {
    constructor() {
        this.metrics = {
            totalExtractions: 0,
            successfulExtractions: 0,
            failedExtractions: 0,
            averageExtractionTime: 0,
            methodSuccessRates: {},
            errorPatterns: {},
            videoTypeAnalysis: {},
            performanceHistory: []
        };
        
        this.startTime = Date.now();
        this.isMonitoring = false;
    }

    startMonitoring() {
        if (this.isMonitoring) {
            console.log('📊 Monitoring already active');
            return;
        }

        this.isMonitoring = true;
        console.log('📊 Starting YouTube subtitle performance monitoring...');
        
        // Hook into extraction events
        this.attachEventListeners();
        
        // Periodic reports
        this.reportInterval = setInterval(() => {
            this.generatePerformanceReport();
        }, 60000); // Every minute
        
        console.log('✅ Performance monitoring active');
    }

    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        if (this.reportInterval) {
            clearInterval(this.reportInterval);
        }
        
        console.log('📊 Performance monitoring stopped');
        this.generateFinalReport();
    }

    recordExtraction(method, success, duration, subtitleCount = 0, error = null, videoId = null) {
        this.metrics.totalExtractions++;
        
        if (success) {
            this.metrics.successfulExtractions++;
        } else {
            this.metrics.failedExtractions++;
            
            // Track error patterns
            if (error) {
                if (!this.metrics.errorPatterns[error]) {
                    this.metrics.errorPatterns[error] = 0;
                }
                this.metrics.errorPatterns[error]++;
            }
        }

        // Track method success rates
        if (!this.metrics.methodSuccessRates[method]) {
            this.metrics.methodSuccessRates[method] = { attempts: 0, successes: 0 };
        }
        this.metrics.methodSuccessRates[method].attempts++;
        if (success) {
            this.metrics.methodSuccessRates[method].successes++;
        }

        // Update average extraction time
        const currentAvg = this.metrics.averageExtractionTime;
        const totalAttempts = this.metrics.totalExtractions;
        this.metrics.averageExtractionTime = ((currentAvg * (totalAttempts - 1)) + duration) / totalAttempts;

        // Record performance history
        this.metrics.performanceHistory.push({
            timestamp: Date.now(),
            method,
            success,
            duration,
            subtitleCount,
            error,
            videoId
        });

        // Analyze video type if possible
        if (videoId) {
            this.analyzeVideoType(videoId, success);
        }

        // Real-time alerting for issues
        this.checkForAnomalies(method, success, duration);
    }

    analyzeVideoType(videoId, success) {
        let videoType = 'regular';
        
        // Detect video type based on URL patterns
        if (window.location.pathname.includes('/shorts/')) {
            videoType = 'shorts';
        } else if (window.location.search.includes('list=')) {
            videoType = 'playlist';
        } else if (document.title.toLowerCase().includes('live')) {
            videoType = 'live';
        }

        if (!this.metrics.videoTypeAnalysis[videoType]) {
            this.metrics.videoTypeAnalysis[videoType] = { attempts: 0, successes: 0 };
        }
        
        this.metrics.videoTypeAnalysis[videoType].attempts++;
        if (success) {
            this.metrics.videoTypeAnalysis[videoType].successes++;
        }
    }

    checkForAnomalies(method, success, duration) {
        // Alert for slow extractions
        if (duration > 10000) { // 10 seconds
            console.warn(`⚠️ Slow extraction detected: ${method} took ${duration}ms`);
        }

        // Alert for high failure rates
        const methodStats = this.metrics.methodSuccessRates[method];
        if (methodStats.attempts >= 5) {
            const successRate = methodStats.successes / methodStats.attempts;
            if (successRate < 0.3) { // Less than 30% success rate
                console.warn(`⚠️ Low success rate for ${method}: ${(successRate * 100).toFixed(1)}%`);
            }
        }

        // Alert for overall failure spike
        if (this.metrics.totalExtractions >= 10) {
            const overallSuccessRate = this.metrics.successfulExtractions / this.metrics.totalExtractions;
            if (overallSuccessRate < 0.5) {
                console.warn(`🚨 Overall success rate critically low: ${(overallSuccessRate * 100).toFixed(1)}%`);
            }
        }
    }

    generatePerformanceReport() {
        if (this.metrics.totalExtractions === 0) {
            console.log('📊 No extraction attempts recorded yet');
            return;
        }

        console.log('\n📊 YOUTUBE SUBTITLE PERFORMANCE REPORT');
        console.log('======================================');
        console.log(`⏱️  Monitoring duration: ${Math.round((Date.now() - this.startTime) / 1000)}s`);
        console.log(`🎯 Total extractions: ${this.metrics.totalExtractions}`);
        console.log(`✅ Successful: ${this.metrics.successfulExtractions} (${((this.metrics.successfulExtractions / this.metrics.totalExtractions) * 100).toFixed(1)}%)`);
        console.log(`❌ Failed: ${this.metrics.failedExtractions} (${((this.metrics.failedExtractions / this.metrics.totalExtractions) * 100).toFixed(1)}%)`);
        console.log(`⚡ Average time: ${Math.round(this.metrics.averageExtractionTime)}ms`);
        console.log('');

        // Method performance
        console.log('🔧 METHOD PERFORMANCE:');
        Object.entries(this.metrics.methodSuccessRates).forEach(([method, stats]) => {
            const successRate = (stats.successes / stats.attempts * 100).toFixed(1);
            console.log(`  ${method}: ${stats.successes}/${stats.attempts} (${successRate}%)`);
        });
        console.log('');

        // Video type analysis
        if (Object.keys(this.metrics.videoTypeAnalysis).length > 0) {
            console.log('📹 VIDEO TYPE ANALYSIS:');
            Object.entries(this.metrics.videoTypeAnalysis).forEach(([type, stats]) => {
                const successRate = (stats.successes / stats.attempts * 100).toFixed(1);
                console.log(`  ${type}: ${stats.successes}/${stats.attempts} (${successRate}%)`);
            });
            console.log('');
        }

        // Top errors
        if (Object.keys(this.metrics.errorPatterns).length > 0) {
            console.log('🚨 TOP ERRORS:');
            const sortedErrors = Object.entries(this.metrics.errorPatterns)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            
            sortedErrors.forEach(([error, count]) => {
                console.log(`  ${error}: ${count} occurrences`);
            });
            console.log('');
        }

        console.log('======================================\n');
    }

    generateFinalReport() {
        console.log('\n📊 FINAL PERFORMANCE SUMMARY');
        console.log('============================');
        
        this.generatePerformanceReport();
        
        // Additional insights
        if (this.metrics.performanceHistory.length > 0) {
            const recentPerformance = this.metrics.performanceHistory.slice(-10);
            const recentSuccessRate = recentPerformance.filter(p => p.success).length / recentPerformance.length;
            
            console.log(`📈 Recent trend (last 10): ${(recentSuccessRate * 100).toFixed(1)}% success rate`);
            
            // Performance over time analysis
            const timeGroups = this.groupByTimeInterval(this.metrics.performanceHistory, 60000); // 1 minute intervals
            console.log(`📊 Performance varied across ${timeGroups.length} time intervals`);
        }
        
        console.log('============================\n');
    }

    groupByTimeInterval(history, intervalMs) {
        const groups = {};
        history.forEach(record => {
            const interval = Math.floor(record.timestamp / intervalMs);
            if (!groups[interval]) {
                groups[interval] = [];
            }
            groups[interval].push(record);
        });
        return Object.values(groups);
    }

    attachEventListeners() {
        // Listen for extraction events
        window.addEventListener('message', (event) => {
            if (event.source !== window) return;
            
            if (event.data.action === 'subtitlesExtracted') {
                this.recordExtraction(
                    'message_extraction',
                    true,
                    0, // Duration not available from message
                    event.data.data?.subtitles?.length || 0,
                    null,
                    event.data.data?.videoId
                );
            } else if (event.data.action === 'extractionFailed') {
                this.recordExtraction(
                    'message_extraction',
                    false,
                    0,
                    0,
                    event.data.data?.reason,
                    event.data.data?.videoId
                );
            }
        });
        
        console.log('👂 Event listeners attached for performance monitoring');
    }

    exportMetrics() {
        const exportData = {
            ...this.metrics,
            exportTime: new Date().toISOString(),
            monitoringDuration: Date.now() - this.startTime
        };
        
        console.log('📤 Exporting performance metrics:', exportData);
        return exportData;
    }

    getRecommendations() {
        const recommendations = [];
        
        // Success rate recommendations
        const overallSuccessRate = this.metrics.successfulExtractions / this.metrics.totalExtractions;
        if (overallSuccessRate < 0.7) {
            recommendations.push({
                type: 'critical',
                message: 'Overall success rate is below 70%. Consider reviewing extraction methods.',
                priority: 'high'
            });
        }

        // Performance recommendations
        if (this.metrics.averageExtractionTime > 5000) {
            recommendations.push({
                type: 'performance',
                message: 'Average extraction time is over 5 seconds. Consider optimizing methods.',
                priority: 'medium'
            });
        }

        // Method-specific recommendations
        Object.entries(this.metrics.methodSuccessRates).forEach(([method, stats]) => {
            const successRate = stats.successes / stats.attempts;
            if (stats.attempts >= 3 && successRate < 0.3) {
                recommendations.push({
                    type: 'method',
                    message: `${method} has low success rate (${(successRate * 100).toFixed(1)}%). Consider disabling or improving.`,
                    priority: 'medium'
                });
            }
        });

        // Error pattern recommendations
        Object.entries(this.metrics.errorPatterns).forEach(([error, count]) => {
            if (count >= 5) {
                recommendations.push({
                    type: 'error',
                    message: `Frequent error: "${error}" (${count} times). Investigate root cause.`,
                    priority: 'high'
                });
            }
        });

        return recommendations;
    }
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
    window.YouTubeSubtitleAnalytics = YouTubeSubtitleAnalytics;
    
    // Global analytics instance
    window.subtitleAnalytics = new YouTubeSubtitleAnalytics();
    
    // Easy-to-use functions
    window.startAnalytics = () => window.subtitleAnalytics.startMonitoring();
    window.stopAnalytics = () => window.subtitleAnalytics.stopMonitoring();
    window.getAnalytics = () => window.subtitleAnalytics.exportMetrics();
    window.getRecommendations = () => window.subtitleAnalytics.getRecommendations();
    
    console.log('📊 YouTube Subtitle Analytics loaded!');
    console.log('💡 Usage: startAnalytics(), stopAnalytics(), getAnalytics(), getRecommendations()');
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = YouTubeSubtitleAnalytics;
}
