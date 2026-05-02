package com.devhire.job.search;

import com.devhire.job.entity.Job;

public interface JobSearchIndex {
    void sync(Job job);

    void remove(Job job);
}
