using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace ReactApp1.Server.Model
{
    public class AgendaItem
    {
        public int Id { get; set; }

        // FK
        public int EventId { get; set; }
        public Event Event { get; set; }

        // 排序（越小越靠前）
        public int Order { get; set; } = 0;

        // 内容
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }

        // 可选时间
        public DateTime? StartAt { get; set; }
        public DateTime? EndAt { get; set; }

        public bool IsDone { get; set; } = false;

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}