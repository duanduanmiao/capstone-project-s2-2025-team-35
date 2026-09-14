namespace ReactApp1.Server.Model.Dto
{
    public class AgendaItemDto
    {
        public int Id { get; set; }
        public int EventId { get; set; }          // ✅ 新增
        public int Order { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTimeOffset? StartAt { get; set; }   // UTC (+00:00)
        public DateTimeOffset? EndAt   { get; set; }
        public bool IsDone { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset UpdatedAt { get; set; }
    }

    public class CreateAgendaItemDto
    {
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public DateTimeOffset? StartAt { get; set; }  // 前端传 ISO 字符串
        public DateTimeOffset? EndAt   { get; set; }
    }

    public class UpdateAgendaItemDto
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public DateTimeOffset? StartAt { get; set; }
        public DateTimeOffset? EndAt   { get; set; }
        public bool? IsDone { get; set; }
    }

    public class ReorderAgendaDto
    {
        public List<ReorderPair> Items { get; set; } = new();
    }

    public class ReorderPair
    {
        public int Id { get; set; }
        public int Order { get; set; }
    }
}